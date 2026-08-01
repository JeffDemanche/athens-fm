import type { VolumeVoteState } from "../entities/VolumeVoteState.js";
import {
  VolumeVoteDirection,
  VolumeVoteValue,
} from "../entities/VolumeVote.js";
import { publishVolumeVoteStateUpdated } from "../graphql/pubsub.js";
import {
  DEFAULT_VOLUME_QUORUM_PERCENT,
  quorumThreshold,
} from "../lib/roomSettings.js";
import { AppError } from "../middleware/errorHandler.js";
import type { ParticipantRepository } from "../repositories/participantRepository.js";
import { participantRepository } from "../repositories/participantRepository.js";
import type { RoomRepository } from "../repositories/roomRepository.js";
import { roomRepository } from "../repositories/roomRepository.js";
import {
  volumeVoteRepository,
  type VolumeVoteRepository,
} from "../repositories/volumeVoteRepository.js";

/** Volume votes needed given active guests and the room's quorum percent. */
export function volumeThreshold(
  participantCount: number,
  percent: number = DEFAULT_VOLUME_QUORUM_PERCENT,
): number {
  return quorumThreshold(participantCount, percent);
}

export function createVolumeVoteService(
  volumeVotes: VolumeVoteRepository = volumeVoteRepository,
  participants: ParticipantRepository = participantRepository,
  rooms: RoomRepository = roomRepository,
) {
  async function buildState(
    roomId: string,
    viewerParticipantId?: string | null,
  ): Promise<VolumeVoteState> {
    const room = await rooms.findById(roomId);
    if (!room) {
      throw new AppError("Room not found", 404);
    }

    const queueItemId = room.nowPlayingQueueItemId
      ? String(room.nowPlayingQueueItemId)
      : null;
    const activeGuestIds = await participants.findActiveGuestIds(room.id);
    const participantCount = activeGuestIds.length;

    let upCount = 0;
    let downCount = 0;
    if (queueItemId && activeGuestIds.length > 0) {
      [upCount, downCount] = await Promise.all([
        volumeVotes.countByRoomParticipantsAndValue(
          room.id,
          activeGuestIds,
          VolumeVoteDirection.UP,
        ),
        volumeVotes.countByRoomParticipantsAndValue(
          room.id,
          activeGuestIds,
          VolumeVoteDirection.DOWN,
        ),
      ]);
    }

    const netCount = queueItemId ? upCount - downCount : 0;
    const threshold = volumeThreshold(
      participantCount,
      room.volumeQuorumPercent,
    );
    const passed = threshold > 0 && Math.abs(netCount) >= threshold;
    const direction = passed
      ? netCount > 0
        ? VolumeVoteDirection.UP
        : VolumeVoteDirection.DOWN
      : null;

    let viewerVote = VolumeVoteValue.NONE;
    if (viewerParticipantId && queueItemId) {
      const vote = await volumeVotes.findByRoomAndParticipant(
        room.id,
        viewerParticipantId,
      );
      if (vote && activeGuestIds.includes(viewerParticipantId)) {
        viewerVote =
          vote.value === VolumeVoteDirection.UP
            ? VolumeVoteValue.UP
            : VolumeVoteValue.DOWN;
      }
    }

    return {
      roomId: room.id,
      queueItemId,
      upCount: queueItemId ? upCount : 0,
      downCount: queueItemId ? downCount : 0,
      netCount,
      participantCount,
      threshold,
      passed,
      direction,
      viewerVote,
    };
  }

  async function clearAndPublish(roomId: string): Promise<VolumeVoteState> {
    await volumeVotes.deleteByRoom(roomId);
    const state = await buildState(roomId);
    publishVolumeVoteStateUpdated(roomId, state);
    return state;
  }

  return {
    async getState(
      roomIdOrShortId: string,
      viewerParticipantId?: string | null,
    ): Promise<VolumeVoteState> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }
      return buildState(room.id, viewerParticipantId);
    },

    /** Recompute and broadcast tally (join / leave / activity changes). */
    async publishStateForRoom(roomId: string): Promise<VolumeVoteState> {
      const state = await buildState(roomId);
      publishVolumeVoteStateUpdated(roomId, state);
      return state;
    },

    /**
     * Soft-pop / track change: clear volume votes and broadcast a reset tally.
     * Does not mutate room.nowPlaying (skip service owns that).
     */
    async resetForNowPlaying(roomId: string): Promise<VolumeVoteState> {
      return clearAndPublish(roomId);
    },

    /** Idle clear or host ack after a successful nudge. */
    async clearVotesForRoom(roomIdOrShortId: string): Promise<VolumeVoteState> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }
      return clearAndPublish(room.id);
    },

    /**
     * Host applied a volume nudge after quorum — wipe votes so another
     * nudge round can begin.
     */
    async acknowledgeNudge(roomIdOrShortId: string): Promise<VolumeVoteState> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }
      return clearAndPublish(room.id);
    },

    /**
     * Set the participant's volume vote for the current now-playing item.
     * NONE clears the vote. Refreshes activity.
     */
    async setVote(
      participantId: string,
      value: VolumeVoteValue,
    ): Promise<VolumeVoteState> {
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
        throw new AppError("Nothing is playing to adjust volume for", 400);
      }

      await participants.touchLastActive(participant.id);

      if (value === VolumeVoteValue.NONE) {
        await volumeVotes.deleteByRoomAndParticipant(room.id, participant.id);
      } else {
        await volumeVotes.upsert({
          roomId: room.id,
          queueItemId,
          participantId: participant.id,
          value:
            value === VolumeVoteValue.UP
              ? VolumeVoteDirection.UP
              : VolumeVoteDirection.DOWN,
        });
      }

      const state = await buildState(room.id, participant.id);
      publishVolumeVoteStateUpdated(room.id, state);
      return state;
    },

    async clearVotesForParticipant(participantId: string): Promise<void> {
      await volumeVotes.deleteByParticipant(participantId);
    },
  };
}

export const volumeVoteService = createVolumeVoteService();
export type VolumeVoteService = ReturnType<typeof createVolumeVoteService>;
