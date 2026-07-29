import { ParticipantRole } from "../entities/Participant.js";
import type { SkipVoteState } from "../entities/SkipVoteState.js";
import { publishSkipVoteStateUpdated } from "../graphql/pubsub.js";
import { AppError } from "../middleware/errorHandler.js";
import type { ParticipantRepository } from "../repositories/participantRepository.js";
import { participantRepository } from "../repositories/participantRepository.js";
import type { RoomRepository } from "../repositories/roomRepository.js";
import { roomRepository } from "../repositories/roomRepository.js";
import {
  skipVoteRepository,
  type SkipVoteRepository,
} from "../repositories/skipVoteRepository.js";

/** Simple majority: more than half of active participants. */
export function skipThreshold(participantCount: number): number {
  if (participantCount <= 0) {
    return 0;
  }
  return Math.floor(participantCount / 2) + 1;
}

export function createSkipVoteService(
  skipVotes: SkipVoteRepository = skipVoteRepository,
  participants: ParticipantRepository = participantRepository,
  rooms: RoomRepository = roomRepository,
) {
  async function activeParticipantCount(roomId: string): Promise<number> {
    // For now: every guest in the room is active. Hosts are desk operators and
    // are excluded from skip quorum. A follow-up will filter by recent activity.
    const members = await participants.findByRoomId(roomId);
    return members.filter((member) => member.role === ParticipantRole.GUEST)
      .length;
  }

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
    const [voteCount, participantCount] = await Promise.all([
      queueItemId ? skipVotes.countByRoom(room.id) : Promise.resolve(0),
      activeParticipantCount(room.id),
    ]);
    const threshold = skipThreshold(participantCount);
    const passed = threshold > 0 && voteCount >= threshold;

    let viewerHasVoted = false;
    if (viewerParticipantId && queueItemId) {
      const vote = await skipVotes.findByRoomAndParticipant(
        room.id,
        viewerParticipantId,
      );
      viewerHasVoted = Boolean(vote);
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
     * Same toggle again clears the vote.
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
  };
}

export const skipVoteService = createSkipVoteService();
export type SkipVoteService = ReturnType<typeof createSkipVoteService>;
