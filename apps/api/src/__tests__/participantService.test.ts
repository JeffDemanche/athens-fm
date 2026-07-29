import { createParticipantService } from "../services/participantService.js";
import type { Participant } from "../entities/Participant.js";
import { ParticipantRole } from "../entities/Participant.js";
import type { Room } from "../entities/Room.js";
import type { RoomEvent } from "../entities/RoomEvent.js";
import { RoomEventType } from "../entities/RoomEvent.js";
import { activeSince } from "../lib/activeParticipant.js";
import { participantNameKey } from "../lib/participantName.js";
import type { ParticipantRepository } from "../repositories/participantRepository.js";
import type { RoomRepository } from "../repositories/roomRepository.js";
import type { RoomEventService } from "../services/roomEventService.js";
import type { SkipVoteService } from "../services/skipVoteService.js";

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
        nowPlayingQueueItemId: null,
        createdAt: now,
        updatedAt: now,
      };
      rooms.push(room);
      return room;
    },
    async setNowPlaying(roomId, queueItemId) {
      const room = rooms.find((entry) => entry.id === roomId);
      if (!room) {
        return null;
      }
      room.nowPlayingQueueItemId = queueItemId;
      room.updatedAt = new Date();
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
    async findByRoomIdAndNameKey(roomId, nameKey) {
      return (
        participants.find(
          (participant) =>
            participant.roomId === roomId && participant.nameKey === nameKey,
        ) ?? null
      );
    },
    async findActiveGuestIds(roomId, since = activeSince()) {
      return participants
        .filter(
          (participant) =>
            participant.roomId === roomId &&
            participant.role === ParticipantRole.GUEST &&
            participant.lastActiveAt != null &&
            participant.lastActiveAt >= since,
        )
        .map((participant) => participant.id);
    },
    async countActiveGuests(roomId, since = activeSince()) {
      return (await this.findActiveGuestIds(roomId, since)).length;
    },
    async findGuestsExpiredBetween(expiredAfter, expiredBefore) {
      return participants.filter(
        (participant) =>
          participant.role === ParticipantRole.GUEST &&
          participant.lastActiveAt != null &&
          participant.lastActiveAt >= expiredAfter &&
          participant.lastActiveAt < expiredBefore,
      );
    },
    async findRoomIdsWithGuestsExpiredBetween(expiredAfter, expiredBefore) {
      const roomIds = new Set<string>();
      for (const participant of await this.findGuestsExpiredBetween(
        expiredAfter,
        expiredBefore,
      )) {
        roomIds.add(String(participant.roomId));
      }
      return [...roomIds];
    },
    async create(input) {
      const now = new Date();
      const name = input.name ?? null;
      const participant: Participant = {
        id: `participant_${participants.length + 1}`,
        roomId: input.roomId,
        name,
        nameKey: name ? participantNameKey(name) : null,
        role: input.role,
        lastActiveAt: input.lastActiveAt ?? null,
        createdAt: now,
        updatedAt: now,
      };
      participants.push(participant);
      return participant;
    },
    async touchLastActive(id, at = new Date()) {
      const participant = participants.find((entry) => entry.id === id);
      if (!participant) {
        return null;
      }
      participant.lastActiveAt = at;
      participant.updatedAt = at;
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

function createFakeSkipVotes(): SkipVoteService & {
  publishCalls: string[];
} {
  const publishCalls: string[] = [];
  return {
    publishCalls,
    async getState() {
      throw new Error("not used");
    },
    async publishStateForRoom(roomId) {
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
    async resetForNowPlaying() {
      throw new Error("not used");
    },
    async clearNowPlaying() {
      throw new Error("not used");
    },
    async toggle() {
      throw new Error("not used");
    },
    async clearVotesForParticipant() {},
  };
}

function createFakeEvents(): RoomEventService & { events: RoomEvent[] } {
  const events: RoomEvent[] = [];

  function push(
    participant: {
      id: string;
      roomId: string | { toString(): string };
      name?: string | null;
      role: RoomEvent["participantRole"];
    },
    type: RoomEventType,
    detail: string | null = null,
  ): RoomEvent {
    const now = new Date();
    const event: RoomEvent = {
      id: `event_${events.length + 1}`,
      roomId: String(participant.roomId),
      participantId: participant.id,
      participantName: participant.name ?? null,
      participantRole: participant.role,
      type,
      detail,
      createdAt: now,
      updatedAt: now,
    };
    events.push(event);
    return event;
  }

  return {
    events,
    async listByRoom(roomId) {
      return events.filter((event) => event.roomId === roomId);
    },
    async recordJoin(participant) {
      return push(participant, RoomEventType.JOINED);
    },
    async recordLeave(participant) {
      return push(participant, RoomEventType.LEFT);
    },
    async recordItemSubmitted(participant, title) {
      return push(participant, RoomEventType.ITEM_SUBMITTED, title);
    },
    async recordNowPlaying(participant, title) {
      return push(participant, RoomEventType.NOW_PLAYING, title);
    },
    async recordBecameInactive(participant) {
      return push(participant, RoomEventType.BECAME_INACTIVE);
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

  it("hosts join without a name", async () => {
    const events = createFakeEvents();
    const service = createParticipantService(
      createFakeParticipants(),
      createFakeRooms([room]),
      events,
      createFakeSkipVotes(),
    );

    const host = await service.joinAsHost("room_1");
    expect(host).toMatchObject({
      roomId: "room_1",
      role: ParticipantRole.HOST,
      name: null,
      lastActiveAt: null,
    });
    expect(events.events[0]).toMatchObject({
      type: RoomEventType.JOINED,
      participantName: null,
      participantRole: ParticipantRole.HOST,
    });
  });

  it("joins a room as guest, records events, and leaves", async () => {
    const events = createFakeEvents();
    const service = createParticipantService(
      createFakeParticipants(),
      createFakeRooms([room]),
      events,
      createFakeSkipVotes(),
    );

    const guest = await service.joinAsGuest("k7m2p", "Maya");
    expect(guest).toMatchObject({
      roomId: "room_1",
      role: ParticipantRole.GUEST,
      name: "Maya",
    });
    expect(guest.lastActiveAt).toBeInstanceOf(Date);
    expect(events.events).toEqual([
      expect.objectContaining({
        type: RoomEventType.JOINED,
        participantId: guest.id,
        participantName: "Maya",
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
        participantName: "Maya",
      }),
    ]);
  });

  it("rejects duplicate names in the same room (case-insensitive)", async () => {
    const service = createParticipantService(
      createFakeParticipants(),
      createFakeRooms([room]),
      createFakeEvents(),
      createFakeSkipVotes(),
    );

    await service.joinAsGuest("K7M2P", "Maya");
    await expect(service.joinAsGuest("K7M2P", " maya ")).rejects.toMatchObject({
      message: /already taken/i,
      statusCode: 409,
    });
  });

  it("rejects join when room is missing", async () => {
    const service = createParticipantService(
      createFakeParticipants(),
      createFakeRooms([]),
      createFakeEvents(),
      createFakeSkipVotes(),
    );

    await expect(service.joinAsGuest("MISSING", "Maya")).rejects.toMatchObject({
      message: "Room not found",
      statusCode: 404,
    });
  });

  it("touchActivity refreshes guest lastActiveAt", async () => {
    const service = createParticipantService(
      createFakeParticipants(),
      createFakeRooms([room]),
      createFakeEvents(),
      createFakeSkipVotes(),
    );

    const guest = await service.joinAsGuest("K7M2P", "Maya");
    const earlier = guest.lastActiveAt!;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const touched = await service.touchActivity(guest.id);
    expect(touched.lastActiveAt!.getTime()).toBeGreaterThan(earlier.getTime());
  });

  it("touchActivity only republishes skip state when a guest becomes active", async () => {
    const participants = createFakeParticipants();
    const skipVotes = createFakeSkipVotes();
    const service = createParticipantService(
      participants,
      createFakeRooms([room]),
      createFakeEvents(),
      skipVotes,
    );

    const guest = await service.joinAsGuest("K7M2P", "Maya");
    // joinAsGuest already published once.
    expect(skipVotes.publishCalls).toEqual(["room_1"]);

    await service.touchActivity(guest.id);
    expect(skipVotes.publishCalls).toEqual(["room_1"]);

    // Simulate falling out of the active TTL.
    await participants.touchLastActive(
      guest.id,
      new Date(Date.now() - 21 * 60 * 1000),
    );

    await service.touchActivity(guest.id);
    expect(skipVotes.publishCalls).toEqual(["room_1", "room_1"]);
  });
});
