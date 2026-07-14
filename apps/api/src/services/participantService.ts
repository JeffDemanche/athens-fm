import type { Participant } from "../entities/Participant.js";
import { ParticipantRole } from "../entities/Participant.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  participantRepository,
  type ParticipantRepository,
} from "../repositories/participantRepository.js";
import type { RoomRepository } from "../repositories/roomRepository.js";
import { roomRepository } from "../repositories/roomRepository.js";
import {
  roomEventService,
  type RoomEventService,
} from "./roomEventService.js";

export function createParticipantService(
  repo: ParticipantRepository = participantRepository,
  rooms: RoomRepository = roomRepository,
  events: RoomEventService = roomEventService,
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

      const participant = await repo.create({
        roomId: room.id,
        role: ParticipantRole.HOST,
      });
      await events.recordJoin(participant);
      return participant;
    },

    async joinAsGuest(roomIdOrShortId: string): Promise<Participant> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }

      const participant = await repo.create({
        roomId: room.id,
        role: ParticipantRole.GUEST,
      });
      await events.recordJoin(participant);
      return participant;
    },

    async leave(participantId: string): Promise<boolean> {
      const existing = await repo.findById(participantId);
      if (!existing) {
        throw new AppError("Participant not found", 404);
      }

      await events.recordLeave(existing);
      return repo.deleteById(participantId);
    },
  };
}

export const participantService = createParticipantService();
export type ParticipantService = ReturnType<typeof createParticipantService>;
