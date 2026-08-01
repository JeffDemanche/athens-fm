import {
  ACTIVE_PARTICIPANT_TTL_MS,
  ACTIVE_SWEEP_INTERVAL_MS,
  recentlyExpiredWindow,
} from "../lib/activeParticipant.js";
import { ParticipantRole, type Participant } from "../entities/Participant.js";
import { RoomEventType, type RoomEvent } from "../entities/RoomEvent.js";
import { createActivitySweepService } from "../services/activitySweepService.js";
import type { RoomEventService } from "../services/roomEventService.js";

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

function guest(partial: Partial<Participant> & Pick<Participant, "id" | "roomId">): Participant {
  const now = new Date();
  return {
    name: partial.name ?? "Guest",
    nameKey: partial.nameKey ?? "guest",
    role: ParticipantRole.GUEST,
    lastActiveAt: partial.lastActiveAt ?? now,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    ...partial,
  };
}

describe("activitySweepService", () => {
  it("records inactive events and republishes skip state", async () => {
    const publishCalls: string[] = [];
    const inactiveParticipants: string[] = [];
    const expiredLookups: Array<{ after: Date; before: Date }> = [];

    const guests = [
      guest({ id: "g1", roomId: "room_a", name: "Ada" }),
      guest({ id: "g2", roomId: "room_b", name: "Bea" }),
      guest({ id: "g3", roomId: "room_a", name: "Cal" }),
    ];

    const events: RoomEventService = {
      listByRoom: async () => [],
      recordJoin: async () => {
        throw new Error("unexpected");
      },
      recordLeave: async () => {
        throw new Error("unexpected");
      },
      recordItemSubmitted: async () => {
        throw new Error("unexpected");
      },
      recordNowPlaying: async () => {
        throw new Error("unexpected");
      },
      recordBecameInactive: async (participant) => {
        inactiveParticipants.push(participant.id);
        const now = new Date();
        return {
          id: `evt_${participant.id}`,
          roomId: String(participant.roomId),
          participantId: participant.id,
          participantName: participant.name ?? null,
          participantRole: participant.role,
          type: RoomEventType.BECAME_INACTIVE,
          detail: null,
          createdAt: now,
          updatedAt: now,
        } satisfies RoomEvent;
      },
    };

    const sweep = createActivitySweepService(
      {
        findGuestsExpiredBetween: async (
          expiredAfter: Date,
          expiredBefore: Date,
        ) => {
          expiredLookups.push({ after: expiredAfter, before: expiredBefore });
          return guests;
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
      {
        publishStateForRoom: async () => ({
          roomId: "",
          queueItemId: null,
          upCount: 0,
          downCount: 0,
          netCount: 0,
          participantCount: 0,
          threshold: 0,
          passed: false,
          direction: null,
          viewerVote: "NONE",
        }),
      } as never,
      events,
    );

    const now = new Date("2026-07-28T12:00:00.000Z");
    const result = await sweep.sweep(now);

    expect(result.roomIds.sort()).toEqual(["room_a", "room_b"]);
    expect(result.inactiveEventCount).toBe(3);
    expect(inactiveParticipants).toEqual(["g1", "g2", "g3"]);
    expect(publishCalls.sort()).toEqual(["room_a", "room_b"]);
    expect(expiredLookups).toHaveLength(1);
    expect(expiredLookups[0]?.before.getTime()).toBe(
      now.getTime() - ACTIVE_PARTICIPANT_TTL_MS,
    );
  });

  it("publishes nothing when no guests expired in the lookback window", async () => {
    const publishCalls: string[] = [];
    const sweep = createActivitySweepService(
      {
        findGuestsExpiredBetween: async () => [],
      } as never,
      {
        publishStateForRoom: async (roomId: string) => {
          publishCalls.push(roomId);
        },
      } as never,
      {
        publishStateForRoom: async () => undefined,
      } as never,
      {
        recordBecameInactive: async () => {
          throw new Error("unexpected");
        },
      } as never,
    );

    const result = await sweep.sweep();
    expect(result.roomIds).toEqual([]);
    expect(result.inactiveEventCount).toBe(0);
    expect(publishCalls).toEqual([]);
  });

  it("counts only newly recorded inactive events", async () => {
    const sweep = createActivitySweepService(
      {
        findGuestsExpiredBetween: async () => [
          guest({ id: "g1", roomId: "room_a" }),
          guest({ id: "g2", roomId: "room_a" }),
        ],
      } as never,
      {
        publishStateForRoom: async () => undefined,
      } as never,
      {
        publishStateForRoom: async () => undefined,
      } as never,
      {
        recordBecameInactive: async (participant: Participant) =>
          participant.id === "g1"
            ? ({
                id: "evt_1",
                roomId: "room_a",
                participantId: "g1",
                participantName: "Guest",
                participantRole: ParticipantRole.GUEST,
                type: RoomEventType.BECAME_INACTIVE,
                detail: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              } satisfies RoomEvent)
            : null,
      } as never,
    );

    const result = await sweep.sweep();
    expect(result.roomIds).toEqual(["room_a"]);
    expect(result.inactiveEventCount).toBe(1);
  });
});
