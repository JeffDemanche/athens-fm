import { ParticipantRole } from "../entities/Participant.js";
import type { Room } from "../entities/Room.js";
import type { RoomSettingsInput } from "../entities/RoomSettingsInput.js";
import {
  clampQuorumPercent,
  type RoomSettings,
} from "../lib/roomSettings.js";
import { AppError } from "../middleware/errorHandler.js";
import type { ParticipantRepository } from "../repositories/participantRepository.js";
import { participantRepository } from "../repositories/participantRepository.js";
import {
  roomRepository,
  type RoomRepository,
} from "../repositories/roomRepository.js";
import {
  skipVoteService,
  type SkipVoteService,
} from "./skipVoteService.js";
import {
  volumeVoteService,
  type VolumeVoteService,
} from "./volumeVoteService.js";

function normalizeOptionalPositiveInt(
  value: number | null | undefined,
  fieldLabel: string,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new AppError(`${fieldLabel} must be a positive whole number`, 400);
  }
  return value;
}

function normalizeSettings(input: RoomSettingsInput): RoomSettings {
  if (
    !Number.isFinite(input.skipQuorumPercent) ||
    !Number.isInteger(input.skipQuorumPercent)
  ) {
    throw new AppError("Skip quorum percent must be a whole number", 400);
  }
  if (
    !Number.isFinite(input.volumeQuorumPercent) ||
    !Number.isInteger(input.volumeQuorumPercent)
  ) {
    throw new AppError("Volume quorum percent must be a whole number", 400);
  }
  if (input.skipQuorumPercent < 1 || input.skipQuorumPercent > 100) {
    throw new AppError("Skip quorum percent must be between 1 and 100", 400);
  }
  if (input.volumeQuorumPercent < 1 || input.volumeQuorumPercent > 100) {
    throw new AppError("Volume quorum percent must be between 1 and 100", 400);
  }

  return {
    skipQuorumPercent: clampQuorumPercent(input.skipQuorumPercent),
    volumeQuorumPercent: clampQuorumPercent(input.volumeQuorumPercent),
    maxSubmissionDurationMinutes: normalizeOptionalPositiveInt(
      input.maxSubmissionDurationMinutes,
      "Max submission duration",
    ),
    maxSimultaneousSubmissions: normalizeOptionalPositiveInt(
      input.maxSimultaneousSubmissions,
      "Max simultaneous submissions",
    ),
  };
}

export function createRoomService(
  repo: RoomRepository = roomRepository,
  participants: ParticipantRepository = participantRepository,
  skipVotes: SkipVoteService = skipVoteService,
  volumeVotes: VolumeVoteService = volumeVoteService,
) {
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

    /**
     * Host-only update of per-room vote/submission settings.
     * Republishes skip + volume tallies so live thresholds refresh.
     */
    async updateSettings(
      participantId: string,
      input: RoomSettingsInput,
    ): Promise<Room> {
      const participant = await participants.findById(participantId);
      if (!participant) {
        throw new AppError("Participant not found", 404);
      }
      if (participant.role !== ParticipantRole.HOST) {
        throw new AppError("Only the host can update room settings", 403);
      }

      const roomId = String(participant.roomId);
      const room = await repo.findById(roomId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }

      const settings = normalizeSettings(input);
      const updated = await repo.updateSettings(room.id, settings);
      if (!updated) {
        throw new AppError("Room not found", 404);
      }

      await skipVotes.publishStateForRoom(room.id);
      await volumeVotes.publishStateForRoom(room.id);
      return updated;
    },
  };
}

export const roomService = createRoomService();
export type RoomService = ReturnType<typeof createRoomService>;
