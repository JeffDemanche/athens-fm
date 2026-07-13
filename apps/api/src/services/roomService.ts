import { AppError } from "../middleware/errorHandler.js";
import {
  roomRepository,
  type RoomRepository,
} from "../repositories/roomRepository.js";
import type { Room } from "../types/room.js";

export function createRoomService(repo: RoomRepository = roomRepository) {
  return {
    async getById(id: string): Promise<Room | null> {
      return repo.findById(id);
    },

    async list(): Promise<Room[]> {
      return repo.findAll();
    },

    async create(name: string): Promise<Room> {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new AppError("Room name is required", 400);
      }
      if (trimmed.length > 120) {
        throw new AppError("Room name must be 120 characters or fewer", 400);
      }

      return repo.create({ name: trimmed });
    },
  };
}

export const roomService = createRoomService();
export type RoomService = ReturnType<typeof createRoomService>;
