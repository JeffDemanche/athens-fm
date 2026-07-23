import type { Vote } from "../entities/Vote.js";
import { VoteValue } from "../entities/Vote.js";
import type { VotePayload } from "../entities/VotePayload.js";
import { publishQueueItemUpdated } from "../graphql/pubsub.js";
import { AppError } from "../middleware/errorHandler.js";
import type { ParticipantRepository } from "../repositories/participantRepository.js";
import { participantRepository } from "../repositories/participantRepository.js";
import type { QueueItemRepository } from "../repositories/queueItemRepository.js";
import { queueItemRepository } from "../repositories/queueItemRepository.js";
import type { RoomRepository } from "../repositories/roomRepository.js";
import { roomRepository } from "../repositories/roomRepository.js";
import {
  voteRepository,
  type VoteRepository,
} from "../repositories/voteRepository.js";

function scoreDelta(
  previous: VoteValue | null,
  next: VoteValue | null,
): number {
  const toPoints = (value: VoteValue | null) => {
    if (value === VoteValue.UP) {
      return 1;
    }
    if (value === VoteValue.DOWN) {
      return -1;
    }
    return 0;
  };
  return toPoints(next) - toPoints(previous);
}

export function createVoteService(
  votes: VoteRepository = voteRepository,
  queueItems: QueueItemRepository = queueItemRepository,
  participants: ParticipantRepository = participantRepository,
  rooms: RoomRepository = roomRepository,
) {
  return {
    async getViewerVote(
      queueItemId: string,
      participantId: string,
    ): Promise<VoteValue | null> {
      const vote = await votes.findByQueueItemAndParticipant(
        queueItemId,
        participantId,
      );
      return vote?.value ?? null;
    },

    async listForParticipant(
      roomIdOrShortId: string,
      participantId: string,
    ): Promise<Vote[]> {
      const participant = await participants.findById(participantId);
      if (!participant) {
        return [];
      }

      const room = await rooms.findById(roomIdOrShortId);
      if (!room || String(participant.roomId) !== room.id) {
        return [];
      }

      return votes.findByRoomAndParticipant(room.id, participant.id);
    },

    /**
     * Cast or toggle a vote. Submitting the same value again clears the vote.
     * One vote per participant per queue item.
     */
    async voteOnQueueItem(input: {
      participantId: string;
      queueItemId: string;
      value: VoteValue;
    }): Promise<VotePayload> {
      const participant = await participants.findById(input.participantId);
      if (!participant) {
        throw new AppError("Participant not found", 404);
      }

      const item = await queueItems.findById(input.queueItemId);
      if (!item) {
        throw new AppError("Queue item not found", 404);
      }

      if (item.finished) {
        throw new AppError("Cannot vote on a finished queue item", 400);
      }

      if (String(item.roomId) !== String(participant.roomId)) {
        throw new AppError("Participant is not in this room", 403);
      }

      const existing = await votes.findByQueueItemAndParticipant(
        item.id,
        participant.id,
      );
      const previousValue = existing?.value ?? null;

      let nextValue: VoteValue | null = input.value;
      if (previousValue === input.value) {
        nextValue = null;
        await votes.deleteByQueueItemAndParticipant(item.id, participant.id);
      } else {
        await votes.upsert({
          roomId: String(item.roomId),
          queueItemId: item.id,
          participantId: participant.id,
          value: input.value,
        });
      }

      const delta = scoreDelta(previousValue, nextValue);
      const updated =
        delta === 0
          ? item
          : await queueItems.adjustScore(item.id, delta);

      if (!updated) {
        throw new AppError("Queue item not found", 404);
      }

      publishQueueItemUpdated(String(updated.roomId), updated);
      return { queueItem: updated, value: nextValue };
    },
  };
}

export const voteService = createVoteService();
export type VoteService = ReturnType<typeof createVoteService>;
