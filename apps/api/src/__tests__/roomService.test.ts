import { createRoomService } from "../services/roomService.js";
import type { Room } from "../types/room.js";
import type { RoomRepository } from "../repositories/roomRepository.js";

function createFakeRepo(seed: Room[] = []): RoomRepository {
  const rooms = [...seed];

  return {
    async findById(id) {
      return rooms.find((room) => room.id === id) ?? null;
    },
    async findAll() {
      return [...rooms];
    },
    async create(input) {
      const now = new Date();
      const room: Room = {
        id: `room_${rooms.length + 1}`,
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
  it("creates a room with a trimmed name", async () => {
    const service = createRoomService(createFakeRepo());
    const room = await service.create("  Late Night  ");

    expect(room.name).toBe("Late Night");
    expect(room.id).toBeTruthy();
  });

  it("rejects an empty name", async () => {
    const service = createRoomService(createFakeRepo());

    await expect(service.create("   ")).rejects.toMatchObject({
      message: "Room name is required",
      statusCode: 400,
    });
  });

  it("returns a room by id", async () => {
    const now = new Date();
    const service = createRoomService(
      createFakeRepo([
        {
          id: "abc",
          name: "Studio A",
          createdAt: now,
          updatedAt: now,
        },
      ]),
    );

    await expect(service.getById("abc")).resolves.toMatchObject({
      id: "abc",
      name: "Studio A",
    });
    await expect(service.getById("missing")).resolves.toBeNull();
  });
});
