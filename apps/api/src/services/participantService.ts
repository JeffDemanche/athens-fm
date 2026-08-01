import type { Participant } from "../entities/Participant.js";
import { ParticipantRole } from "../entities/Participant.js";
import { activeSince } from "../lib/activeParticipant.js";
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
import {
  skipVoteService,
  type SkipVoteService,
} from "./skipVoteService.js";
import {
  volumeVoteService,
  type VolumeVoteService,
} from "./volumeVoteService.js";

export function createParticipantService(
  repo: ParticipantRepository = participantRepository,
  rooms: RoomRepository = roomRepository,
  events: RoomEventService = roomEventService,
  skipVotes: SkipVoteService = skipVoteService,
  volumeVotes: VolumeVoteService = volumeVoteService,
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
    lastActiveAt?: Date | null;
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
        lastActiveAt: null,
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

      const participant = await createParticipant({
        roomId: room.id,
        name,
        role: ParticipantRole.GUEST,
        lastActiveAt: new Date(),
      });
      await skipVotes.publishStateForRoom(room.id);
      await volumeVotes.publishStateForRoom(room.id);
      return participant;
    },

    /**
     * Refresh guest activity so they remain in skip/volume quorum (20m TTL).
     * Hosts are ignored — they are not part of the listening quorum.
     * Vote-state is only republished when the guest newly enters the active
     * set; heartbeat touches for already-active guests stay quiet.
     */
    async touchActivity(participantId: string): Promise<Participant> {
      const existing = await repo.findById(participantId);
      if (!existing) {
        throw new AppError("Participant not found", 404);
      }

      if (existing.role !== ParticipantRole.GUEST) {
        return existing;
      }

      const since = activeSince();
      const wasActive =
        existing.lastActiveAt != null &&
        existing.lastActiveAt.getTime() >= since.getTime();

      const updated = await repo.touchLastActive(existing.id);
      if (!updated) {
        throw new AppError("Participant not found", 404);
      }

      if (!wasActive) {
        const roomId = String(updated.roomId);
        await skipVotes.publishStateForRoom(roomId);
        await volumeVotes.publishStateForRoom(roomId);
      }
      return updated;
    },

    async leave(participantId: string): Promise<boolean> {
      const existing = await repo.findById(participantId);
      if (!existing) {
        throw new AppError("Participant not found", 404);
      }

      const roomId = String(existing.roomId);
      await events.recordLeave(existing);
      await skipVotes.clearVotesForParticipant(existing.id);
      await volumeVotes.clearVotesForParticipant(existing.id);
      const deleted = await repo.deleteById(participantId);
      if (deleted) {
        await skipVotes.publishStateForRoom(roomId);
        await volumeVotes.publishStateForRoom(roomId);
      }
      return deleted;
    },
  };
}

export const participantService = createParticipantService();
export type ParticipantService = ReturnType<typeof createParticipantService>;
