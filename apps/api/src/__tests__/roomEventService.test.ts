import { ParticipantRole, type Participant } from "../entities/Participant.js";
import { RoomEventType } from "../entities/RoomEvent.js";
import { initPubSub } from "../graphql/pubsub.js";
import { createRoomEventService } from "../services/roomEventService.js";

describe("roomEventService", () => {
  beforeAll(() => {
    initPubSub();
  });
  const now = new Date("2026-07-28T12:00:00.000Z");
  const guest: Participant = {
    id: "507f1f77bcf86cd799439011",
    roomId: "507f1f77bcf86cd799439012",
    name: "Maya",
    nameKey: "maya",
    role: ParticipantRole.GUEST,
    lastActiveAt: new Date("2026-07-28T11:30:00.000Z"),
    createdAt: now,
    updatedAt: now,
  };

  it("records submit and now-playing with detail", async () => {
    const created: Array<{ type: RoomEventType; detail: string | null }> = [];

    const service = createRoomEventService(
      {
        findByRoomId: async () => [],
        existsForParticipantSince: async () => false,
        create: async (input) => {
          created.push({ type: input.type, detail: input.detail ?? null });
          return {
            id: `evt_${created.length}`,
            roomId: input.roomId,
            participantId: input.participantId,
            participantName: input.participantName ?? null,
            participantRole: input.participantRole,
            type: input.type,
            detail: input.detail ?? null,
            createdAt: now,
            updatedAt: now,
          };
        },
      },
      {
        findById: async (id: string) =>
          id === guest.roomId
            ? {
                id: String(guest.roomId),
                shortId: "ABC12",
                name: "Room",
                createdAt: now,
                updatedAt: now,
              }
            : null,
      } as never,
    );

    await service.recordItemSubmitted(guest, "Never Gonna Give You Up");
    await service.recordNowPlaying(guest, "Never Gonna Give You Up");

    expect(created).toEqual([
      {
        type: RoomEventType.ITEM_SUBMITTED,
        detail: "Never Gonna Give You Up",
      },
      {
        type: RoomEventType.NOW_PLAYING,
        detail: "Never Gonna Give You Up",
      },
    ]);
  });

  it("skips duplicate BECAME_INACTIVE within the same inactivity window", async () => {
    const createCalls: RoomEventType[] = [];
    let alreadyExists = false;

    const service = createRoomEventService(
      {
        findByRoomId: async () => [],
        existsForParticipantSince: async () => alreadyExists,
        create: async (input) => {
          createCalls.push(input.type);
          alreadyExists = true;
          return {
            id: "evt_1",
            roomId: input.roomId,
            participantId: input.participantId,
            participantName: input.participantName ?? null,
            participantRole: input.participantRole,
            type: input.type,
            detail: input.detail ?? null,
            createdAt: now,
            updatedAt: now,
          };
        },
      },
      {
        findById: async () => ({
          id: String(guest.roomId),
          shortId: "ABC12",
          name: "Room",
          createdAt: now,
          updatedAt: now,
        }),
      } as never,
    );

    const first = await service.recordBecameInactive(guest);
    const second = await service.recordBecameInactive(guest);

    expect(first?.type).toBe(RoomEventType.BECAME_INACTIVE);
    expect(second).toBeNull();
    expect(createCalls).toEqual([RoomEventType.BECAME_INACTIVE]);
  });
});
