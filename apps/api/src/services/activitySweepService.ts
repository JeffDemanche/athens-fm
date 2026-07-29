import {
  ACTIVE_SWEEP_INTERVAL_MS,
  recentlyExpiredWindow,
} from "../lib/activeParticipant.js";
import {
  participantRepository,
  type ParticipantRepository,
} from "../repositories/participantRepository.js";
import {
  skipVoteService,
  type SkipVoteService,
} from "./skipVoteService.js";

export type ActivitySweepResult = {
  roomIds: string[];
};

export function createActivitySweepService(
  participants: ParticipantRepository = participantRepository,
  skipVotes: SkipVoteService = skipVoteService,
) {
  return {
    /**
     * Find rooms where a guest just aged out of the 20m active TTL and
     * republish skipVoteStateUpdated so UI active counts stay current.
     */
    async sweep(
      now: Date = new Date(),
      lookbackMs: number = ACTIVE_SWEEP_INTERVAL_MS * 2,
    ): Promise<ActivitySweepResult> {
      const { expiredAfter, expiredBefore } = recentlyExpiredWindow(
        now,
        lookbackMs,
      );
      const roomIds = await participants.findRoomIdsWithGuestsExpiredBetween(
        expiredAfter,
        expiredBefore,
      );

      for (const roomId of roomIds) {
        await skipVotes.publishStateForRoom(roomId);
      }

      return { roomIds };
    },
  };
}

export const activitySweepService = createActivitySweepService();
export type ActivitySweepService = ReturnType<
  typeof createActivitySweepService
>;
