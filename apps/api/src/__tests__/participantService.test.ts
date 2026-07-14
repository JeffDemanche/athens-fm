import { createParticipantService } from "../services/participantService.js";
import type { Participant } from "../entities/Participant.js";
import { ParticipantRole } from "../entities/Participant.js";
import type { Room } from "../entities/Room.js";
import type { RoomEvent } from "../entities/RoomEvent.js";
import { RoomEventType } from "../entities/RoomEvent.js";
import type { ParticipantRepository } from "../repositories/participantRepository.js";
import type { RoomRepository } from "../repositories/roomRepository.js";
import type { RoomEventService } from "../services/roomEventService.js";

function createFakeRooms(seed: Room[] = []): RoomRepository {
  const rooms = [...seed];
  return {
    async findById(id) {
      const normalized = id.trim().toUpperCase();
      return (
        rooms.find(
          (room) => room.id === id || room.shortId === normalized,
        ) ?? null
      );
    },
    async findAll() {
      return [...rooms];
    },
    async create(input) {
      const now = new Date();
      const room: Room = {
        id: `room_${rooms.length + 1}`,
        shortId: `A${String(rooms.length + 1).padStart(4, "2")}`,
        name: input.name,
        createdAt: now,
        updatedAt: now,
      };
      rooms.push(room);
      return room;
    },
  };
}

function createFakeParticipants(
  seed: Participant[] = [],
): ParticipantRepository {
  const participants = [...seed];
  return {
    async findById(id) {
      return participants.find((participant) => participant.id === id) ?? null;
    },
    async findByRoomId(roomId) {
      return participants.filter((participant) => participant.roomId === roomId);
    },
    async create(input) {
      const now = new Date();
      const participant: Participant = {
        id: `participant_${participants.length + 1}`,
        roomId: input.roomId,
        role: input.role,
        createdAt: now,
        updatedAt: now,
      };
      participants.push(participant);
      return participant;
    },
    async deleteById(id) {
      const index = participants.findIndex(
        (participant) => participant.id === id,
      );
      if (index === -1) {
        return false;
      }
      participants.splice(index, 1);
      return true;
    },
  };
}

function createFakeEvents(): RoomEventService & { events: RoomEvent[] } {
  const events: RoomEvent[] = [];
  return {
    events,
    async listByRoom(roomId) {
      return events.filter((event) => event.roomId === roomId);
    },
    async recordJoin(participant) {
      const now = new Date();
      const event: RoomEvent = {
        id: `event_${events.length + 1}`,
        roomId: String(participant.roomId),
        participantId: participant.id,
        participantRole: participant.role,
        type: RoomEventType.JOINED,
        createdAt: now,
        updatedAt: now,
      };
      events.push(event);
      return event;
    },
    async recordLeave(participant) {
      const now = new Date();
      const event: RoomEvent = {
        id: `event_${events.length + 1}`,
        roomId: String(participant.roomId),
        participantId: participant.id,
        participantRole: participant.role,
        type: RoomEventType.LEFT,
        createdAt: now,
        updatedAt: now,
      };
      events.push(event);
      return event;
    },
  };
}

describe("participantService", () => {
  const now = new Date();
  const room: Room = {
    id: "room_1",
    shortId: "K7M2P",
    name: "Studio",
    createdAt: now,
    updatedAt: now,
  };

  it("joins a room as guest, records events, and leaves", async () => {
    const events = createFakeEvents();
    const service = createParticipantService(
      createFakeParticipants(),
      createFakeRooms([room]),
      events,
    );

    const guest = await service.joinAsGuest("k7m2p");
    expect(guest).toMatchObject({
      roomId: "room_1",
      role: ParticipantRole.GUEST,
    });
    expect(events.events).toEqual([
      expect.objectContaining({
        type: RoomEventType.JOINED,
        participantId: guest.id,
        roomId: "room_1",
      }),
    ]);

    await expect(service.leave(guest.id)).resolves.toBe(true);
    await expect(service.getById(guest.id)).resolves.toBeNull();
    expect(events.events).toEqual([
      expect.objectContaining({ type: RoomEventType.JOINED }),
      expect.objectContaining({
        type: RoomEventType.LEFT,
        participantId: guest.id,
      }),
    ]);
  });

  it("rejects join when room is missing", async () => {
    const service = createParticipantService(
      createFakeParticipants(),
      createFakeRooms([]),
      createFakeEvents(),
    );

    await expect(service.joinAsGuest("MISSING")).rejects.toMatchObject({
      message: "Room not found",
      statusCode: 404,
    });
  });
});
