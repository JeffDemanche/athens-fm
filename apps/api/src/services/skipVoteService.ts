import type { SkipVoteState } from "../entities/SkipVoteState.js";
import { publishSkipVoteStateUpdated } from "../graphql/pubsub.js";
import {
  DEFAULT_SKIP_QUORUM_PERCENT,
  quorumThreshold,
} from "../lib/roomSettings.js";
import { AppError } from "../middleware/errorHandler.js";
import type { ParticipantRepository } from "../repositories/participantRepository.js";
import { participantRepository } from "../repositories/participantRepository.js";
import type { RoomRepository } from "../repositories/roomRepository.js";
import { roomRepository } from "../repositories/roomRepository.js";
import {
  skipVoteRepository,
  type SkipVoteRepository,
} from "../repositories/skipVoteRepository.js";

/** Skip votes needed given active guests and the room's quorum percent. */
export function skipThreshold(
  participantCount: number,
  percent: number = DEFAULT_SKIP_QUORUM_PERCENT,
): number {
  return quorumThreshold(participantCount, percent);
}

export function createSkipVoteService(
  skipVotes: SkipVoteRepository = skipVoteRepository,
  participants: ParticipantRepository = participantRepository,
  rooms: RoomRepository = roomRepository,
) {
  async function buildState(
    roomId: string,
    viewerParticipantId?: string | null,
  ): Promise<SkipVoteState> {
    const room = await rooms.findById(roomId);
    if (!room) {
      throw new AppError("Room not found", 404);
    }

    const queueItemId = room.nowPlayingQueueItemId
      ? String(room.nowPlayingQueueItemId)
      : null;
    const activeGuestIds = await participants.findActiveGuestIds(room.id);
    const participantCount = activeGuestIds.length;
    const voteCount =
      queueItemId && activeGuestIds.length > 0
        ? await skipVotes.countByRoomAndParticipants(room.id, activeGuestIds)
        : 0;
    const threshold = skipThreshold(
      participantCount,
      room.skipQuorumPercent,
    );
    const passed = threshold > 0 && voteCount >= threshold;

    let viewerHasVoted = false;
    if (viewerParticipantId && queueItemId) {
      const vote = await skipVotes.findByRoomAndParticipant(
        room.id,
        viewerParticipantId,
      );
      viewerHasVoted = Boolean(vote) && activeGuestIds.includes(viewerParticipantId);
    }

    return {
      roomId: room.id,
      queueItemId,
      voteCount: queueItemId ? voteCount : 0,
      participantCount,
      threshold,
      passed,
      viewerHasVoted,
    };
  }

  return {
    async getState(
      roomIdOrShortId: string,
      viewerParticipantId?: string | null,
    ): Promise<SkipVoteState> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }
      return buildState(room.id, viewerParticipantId);
    },

    /** Recompute and broadcast tally (join / leave / activity changes). */
    async publishStateForRoom(roomId: string): Promise<SkipVoteState> {
      const state = await buildState(roomId);
      publishSkipVoteStateUpdated(roomId, state);
      return state;
    },

    /**
     * Soft-pop started a new track: point the room at it, clear skip votes,
     * and broadcast a reset tally so participant toggles return to no-skip.
     */
    async resetForNowPlaying(
      roomId: string,
      queueItemId: string,
    ): Promise<SkipVoteState> {
      await rooms.setNowPlaying(roomId, queueItemId);
      await skipVotes.deleteByRoom(roomId);
      const state = await buildState(roomId);
      publishSkipVoteStateUpdated(roomId, state);
      return state;
    },

    /** Track ended with nothing next — clear now-playing and skip tally. */
    async clearNowPlaying(roomIdOrShortId: string): Promise<SkipVoteState> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }
      await rooms.setNowPlaying(room.id, null);
      await skipVotes.deleteByRoom(room.id);
      const state = await buildState(room.id);
      publishSkipVoteStateUpdated(room.id, state);
      return state;
    },

    /**
     * Toggle the participant's skip vote for the current now-playing item.
     * Same toggle again clears the vote. Refreshes activity.
     */
    async toggle(participantId: string): Promise<SkipVoteState> {
      const participant = await participants.findById(participantId);
      if (!participant) {
        throw new AppError("Participant not found", 404);
      }

      const roomId = String(participant.roomId);
      const room = await rooms.findById(roomId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }

      const queueItemId = room.nowPlayingQueueItemId
        ? String(room.nowPlayingQueueItemId)
        : null;
      if (!queueItemId) {
        throw new AppError("Nothing is playing to skip", 400);
      }

      await participants.touchLastActive(participant.id);

      const existing = await skipVotes.findByRoomAndParticipant(
        room.id,
        participant.id,
      );

      if (existing) {
        await skipVotes.deleteByRoomAndParticipant(room.id, participant.id);
      } else {
        await skipVotes.upsert({
          roomId: room.id,
          queueItemId,
          participantId: participant.id,
        });
      }

      const state = await buildState(room.id, participant.id);
      publishSkipVoteStateUpdated(room.id, state);
      return state;
    },

    async clearVotesForParticipant(participantId: string): Promise<void> {
      await skipVotes.deleteByParticipant(participantId);
    },
  };
}

export const skipVoteService = createSkipVoteService();
export type SkipVoteService = ReturnType<typeof createSkipVoteService>;
