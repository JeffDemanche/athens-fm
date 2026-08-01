import {
  ACTIVE_SWEEP_INTERVAL_MS,
  recentlyExpiredWindow,
} from "../lib/activeParticipant.js";
import {
  participantRepository,
  type ParticipantRepository,
} from "../repositories/participantRepository.js";
import {
  roomEventService,
  type RoomEventService,
} from "./roomEventService.js";
import {
  skipVoteService,
  type SkipVoteService,
} from "./skipVoteService.js";
import {
  volumeVoteService,
  type VolumeVoteService,
} from "./volumeVoteService.js";

export type ActivitySweepResult = {
  roomIds: string[];
  inactiveEventCount: number;
};

export function createActivitySweepService(
  participants: ParticipantRepository = participantRepository,
  skipVotes: SkipVoteService = skipVoteService,
  volumeVotes: VolumeVoteService = volumeVoteService,
  events: RoomEventService = roomEventService,
) {
  return {
    /**
     * Find guests who just aged out of the 20m active TTL, post brief
     * BECAME_INACTIVE room events, and republish skip/volume vote state so UI
     * active counts stay current.
     */
    async sweep(
      now: Date = new Date(),
      lookbackMs: number = ACTIVE_SWEEP_INTERVAL_MS * 2,
    ): Promise<ActivitySweepResult> {
      const { expiredAfter, expiredBefore } = recentlyExpiredWindow(
        now,
        lookbackMs,
      );
      const expiredGuests = await participants.findGuestsExpiredBetween(
        expiredAfter,
        expiredBefore,
      );

      let inactiveEventCount = 0;
      const roomIds = new Set<string>();

      for (const guest of expiredGuests) {
        const roomId = String(guest.roomId);
        roomIds.add(roomId);
        const event = await events.recordBecameInactive(guest);
        if (event) {
          inactiveEventCount += 1;
        }
      }

      for (const roomId of roomIds) {
        await skipVotes.publishStateForRoom(roomId);
        await volumeVotes.publishStateForRoom(roomId);
      }

      return { roomIds: [...roomIds], inactiveEventCount };
    },
  };
}

export const activitySweepService = createActivitySweepService();
export type ActivitySweepService = ReturnType<
  typeof createActivitySweepService
>;
