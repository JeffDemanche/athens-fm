import type { Participant } from "../entities/Participant.js";
import { ParticipantRole } from "../entities/Participant.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  participantRepository,
  type ParticipantRepository,
} from "../repositories/participantRepository.js";
import type { RoomRepository } from "../repositories/roomRepository.js";
import { roomRepository } from "../repositories/roomRepository.js";

export function createParticipantService(
  repo: ParticipantRepository = participantRepository,
  rooms: RoomRepository = roomRepository,
) {
  return {
    async getById(id: string): Promise<Participant | null> {
      return repo.findById(id);
    },

    async listByRoom(roomId: string): Promise<Participant[]> {
      const room = await rooms.findById(roomId);
      if (!room) {
        return [];
      }
      return repo.findByRoomId(room.id);
    },

    async joinAsHost(roomId: string): Promise<Participant> {
      const room = await rooms.findById(roomId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }

      return repo.create({ roomId: room.id, role: ParticipantRole.HOST });
    },

    async joinAsGuest(roomIdOrShortId: string): Promise<Participant> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }

      return repo.create({ roomId: room.id, role: ParticipantRole.GUEST });
    },

    async leave(participantId: string): Promise<boolean> {
      const existing = await repo.findById(participantId);
      if (!existing) {
        throw new AppError("Participant not found", 404);
      }

      return repo.deleteById(participantId);
    },
  };
}

export const participantService = createParticipantService();
export type ParticipantService = ReturnType<typeof createParticipantService>;
