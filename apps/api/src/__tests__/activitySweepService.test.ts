import {
  ACTIVE_PARTICIPANT_TTL_MS,
  ACTIVE_SWEEP_INTERVAL_MS,
  recentlyExpiredWindow,
} from "../lib/activeParticipant.js";
import { createActivitySweepService } from "../services/activitySweepService.js";

describe("recentlyExpiredWindow", () => {
  it("aligns the upper bound with the active TTL", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    const { expiredAfter, expiredBefore } = recentlyExpiredWindow(
      now,
      ACTIVE_SWEEP_INTERVAL_MS,
    );

    expect(expiredBefore.getTime()).toBe(
      now.getTime() - ACTIVE_PARTICIPANT_TTL_MS,
    );
    expect(expiredAfter.getTime()).toBe(
      expiredBefore.getTime() - ACTIVE_SWEEP_INTERVAL_MS,
    );
  });
});

describe("activitySweepService", () => {
  it("republishes skip state for rooms with recently expired guests", async () => {
    const publishCalls: string[] = [];
    const expiredLookups: Array<{ after: Date; before: Date }> = [];

    const sweep = createActivitySweepService(
      {
        findRoomIdsWithGuestsExpiredBetween: async (
          expiredAfter: Date,
          expiredBefore: Date,
        ) => {
          expiredLookups.push({ after: expiredAfter, before: expiredBefore });
          return ["room_a", "room_b"];
        },
      } as never,
      {
        publishStateForRoom: async (roomId: string) => {
          publishCalls.push(roomId);
          return {
            roomId,
            queueItemId: null,
            voteCount: 0,
            participantCount: 0,
            threshold: 0,
            passed: false,
            viewerHasVoted: false,
          };
        },
      } as never,
    );

    const now = new Date("2026-07-28T12:00:00.000Z");
    const result = await sweep.sweep(now);

    expect(result.roomIds).toEqual(["room_a", "room_b"]);
    expect(publishCalls).toEqual(["room_a", "room_b"]);
    expect(expiredLookups).toHaveLength(1);
    expect(expiredLookups[0]?.before.getTime()).toBe(
      now.getTime() - ACTIVE_PARTICIPANT_TTL_MS,
    );
  });

  it("publishes nothing when no guests expired in the lookback window", async () => {
    const publishCalls: string[] = [];
    const sweep = createActivitySweepService(
      {
        findRoomIdsWithGuestsExpiredBetween: async () => [],
      } as never,
      {
        publishStateForRoom: async (roomId: string) => {
          publishCalls.push(roomId);
        },
      } as never,
    );

    const result = await sweep.sweep();
    expect(result.roomIds).toEqual([]);
    expect(publishCalls).toEqual([]);
  });
});
