import { createRoomService } from "../services/roomService.js";
import type { Room } from "../entities/Room.js";
import { DEFAULT_ROOM_SETTINGS } from "../lib/roomSettings.js";
import type { RoomRepository } from "../repositories/roomRepository.js";
import type { ParticipantRepository } from "../repositories/participantRepository.js";
import { ParticipantRole } from "../entities/Participant.js";
import type { SkipVoteService } from "../services/skipVoteService.js";
import type { VolumeVoteService } from "../services/volumeVoteService.js";

function createFakeRepo(seed: Room[] = []): RoomRepository {
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
        ...DEFAULT_ROOM_SETTINGS,
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
    async updateSettings(roomId, settings) {
      const room = rooms.find((entry) => entry.id === roomId);
      if (!room) {
        return null;
      }
      Object.assign(room, settings);
      room.updatedAt = new Date();
      return room;
    },
  };
}

function createFakeParticipants(
  hostId: string,
  roomId: string,
): ParticipantRepository {
  return {
    async findById(id: string) {
      if (id !== hostId) {
        return {
          id,
          roomId,
          role: ParticipantRole.GUEST,
          name: "Guest",
          nameKey: "guest",
          lastActiveAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return {
        id: hostId,
        roomId,
        role: ParticipantRole.HOST,
        name: null,
        nameKey: null,
        lastActiveAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
    async findByRoomId() {
      return [];
    },
    async findByRoomIdAndNameKey() {
      return null;
    },
    async findActiveGuestIds() {
      return [];
    },
    async findGuestsBecomingInactive() {
      return [];
    },
    async create() {
      throw new Error("not implemented");
    },
    async touchLastActive() {
      return null;
    },
    async deleteById() {
      return false;
    },
  } as unknown as ParticipantRepository;
}

function createNoopVoteServices(): {
  skip: SkipVoteService;
  volume: VolumeVoteService;
} {
  const publish = async () =>
    ({
      roomId: "room",
      queueItemId: null,
      voteCount: 0,
      participantCount: 0,
      threshold: 0,
      passed: false,
      viewerHasVoted: false,
    }) as never;

  return {
    skip: {
      getState: publish,
      publishStateForRoom: publish,
      resetForNowPlaying: publish,
      clearNowPlaying: publish,
      toggle: publish,
      clearVotesForParticipant: async () => undefined,
    } as unknown as SkipVoteService,
    volume: {
      getState: async () => ({}) as never,
      publishStateForRoom: async () => ({}) as never,
      resetForNowPlaying: async () => ({}) as never,
      clearVotesForRoom: async () => ({}) as never,
      acknowledgeNudge: async () => ({}) as never,
      setVote: async () => ({}) as never,
      clearVotesForParticipant: async () => undefined,
    } as unknown as VolumeVoteService,
  };
}

describe("roomService", () => {
  it("creates a room with a trimmed name and shortId", async () => {
    const service = createRoomService(createFakeRepo());
    const room = await service.create("  Late Night  ");

    expect(room.name).toBe("Late Night");
    expect(room.id).toBeTruthy();
    expect(room.shortId).toHaveLength(5);
    expect(room.skipQuorumPercent).toBe(DEFAULT_ROOM_SETTINGS.skipQuorumPercent);
  });

  it("rejects an empty name", async () => {
    const service = createRoomService(createFakeRepo());

    await expect(service.create("   ")).rejects.toMatchObject({
      message: "Room name is required",
      statusCode: 400,
    });
  });

  it("returns a room by id or shortId", async () => {
    const now = new Date();
    const service = createRoomService(
      createFakeRepo([
        {
          id: "mongo-abc",
          shortId: "K7M2P",
          name: "Studio A",
          nowPlayingQueueItemId: null,
          ...DEFAULT_ROOM_SETTINGS,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    );

    await expect(service.getById("mongo-abc")).resolves.toMatchObject({
      shortId: "K7M2P",
      name: "Studio A",
    });
    await expect(service.getById("k7m2p")).resolves.toMatchObject({
      id: "mongo-abc",
      name: "Studio A",
    });
    await expect(service.getById("missing")).resolves.toBeNull();
  });

  it("updates settings for a host participant", async () => {
    const now = new Date();
    const repo = createFakeRepo([
      {
        id: "room_1",
        shortId: "K7M2P",
        name: "Studio A",
        nowPlayingQueueItemId: null,
        ...DEFAULT_ROOM_SETTINGS,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    const { skip, volume } = createNoopVoteServices();
    const service = createRoomService(
      repo,
      createFakeParticipants("host_1", "room_1"),
      skip,
      volume,
    );

    const updated = await service.updateSettings("host_1", {
      skipQuorumPercent: 75,
      volumeQuorumPercent: 40,
      maxSubmissionDurationMinutes: 8,
      maxSimultaneousSubmissions: null,
    });

    expect(updated).toMatchObject({
      skipQuorumPercent: 75,
      volumeQuorumPercent: 40,
      maxSubmissionDurationMinutes: 8,
      maxSimultaneousSubmissions: null,
    });
  });
});
