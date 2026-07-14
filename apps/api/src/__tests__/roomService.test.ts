import { createRoomService } from "../services/roomService.js";
import type { Room } from "../entities/Room.js";
import type { RoomRepository } from "../repositories/roomRepository.js";

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
        createdAt: now,
        updatedAt: now,
      };
      rooms.push(room);
      return room;
    },
  };
}

describe("roomService", () => {
  it("creates a room with a trimmed name and shortId", async () => {
    const service = createRoomService(createFakeRepo());
    const room = await service.create("  Late Night  ");

    expect(room.name).toBe("Late Night");
    expect(room.id).toBeTruthy();
    expect(room.shortId).toHaveLength(5);
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
});
