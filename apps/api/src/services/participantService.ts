import type { Participant } from "../entities/Participant.js";
import { ParticipantRole } from "../entities/Participant.js";
import {
  DUPLICATE_PARTICIPANT_NAME_MESSAGE,
  isDuplicateParticipantNameError,
  normalizeParticipantName,
  participantNameKey,
} from "../lib/participantName.js";
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
  async function assertNameAvailable(roomId: string, name: string) {
    const existing = await repo.findByRoomIdAndNameKey(
      roomId,
      participantNameKey(name),
    );
    if (existing) {
      throw new AppError(DUPLICATE_PARTICIPANT_NAME_MESSAGE, 409);
    }
  }

  async function createParticipant(input: {
    roomId: string;
    name?: string | null;
    role: ParticipantRole;
  }): Promise<Participant> {
    try {
      const participant = await repo.create(input);
      await events.recordJoin(participant);
      return participant;
    } catch (error) {
      if (isDuplicateParticipantNameError(error)) {
        throw new AppError(DUPLICATE_PARTICIPANT_NAME_MESSAGE, 409);
      }
      throw error;
    }
  }

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

      return createParticipant({
        roomId: room.id,
        name: null,
        role: ParticipantRole.HOST,
      });
    },

    async joinAsGuest(
      roomIdOrShortId: string,
      rawName: string,
    ): Promise<Participant> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }

      const name = normalizeParticipantName(rawName);
      await assertNameAvailable(room.id, name);

      return createParticipant({
        roomId: room.id,
        name,
        role: ParticipantRole.GUEST,
      });
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
