import {
  QueueItemType,
  type QueueItem,
} from "../entities/QueueItem.js";
import { ParticipantRole } from "../entities/Participant.js";
import {
  publishQueueItemAdded,
  publishQueueItemPopped,
} from "../graphql/pubsub.js";
import { resolveExternalId } from "../lib/mediaEmbed.js";
import {
  mediaMetadataProvider,
  type MediaMetadataProvider,
} from "../lib/mediaMetadata.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  queueItemRepository,
  type QueueItemRepository,
} from "../repositories/queueItemRepository.js";
import type { ParticipantRepository } from "../repositories/participantRepository.js";
import { participantRepository } from "../repositories/participantRepository.js";
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

export function createQueueItemService(
  repo: QueueItemRepository = queueItemRepository,
  rooms: RoomRepository = roomRepository,
  participants: ParticipantRepository = participantRepository,
  metadata: MediaMetadataProvider = mediaMetadataProvider,
  skipVotes: SkipVoteService = skipVoteService,
  events: RoomEventService = roomEventService,
  volumeVotes: VolumeVoteService = volumeVoteService,
) {
  return {
    async listByRoom(roomIdOrShortId: string): Promise<QueueItem[]> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        return [];
      }
      return repo.findActiveByRoomId(room.id);
    },

    async getById(id: string): Promise<QueueItem | null> {
      return repo.findById(id);
    },

    async add(input: {
      participantId: string;
      type: QueueItemType;
      mediaRef: string;
    }): Promise<QueueItem> {
      const participant = await participants.findById(input.participantId);
      if (!participant) {
        throw new AppError("Participant not found", 404);
      }

      const roomId = String(participant.roomId);
      const room = await rooms.findById(roomId);
      if (!room) {
        throw new AppError("Room not found", 404);
      }

      const externalId = resolveExternalId(input.type, input.mediaRef);
      const { title, thumbnailUrl, durationSeconds } = await metadata.fetch(
        input.type,
        externalId,
      );

      const maxDurationMinutes = room.maxSubmissionDurationMinutes ?? null;
      if (
        maxDurationMinutes !== null &&
        durationSeconds !== null &&
        durationSeconds > maxDurationMinutes * 60
      ) {
        throw new AppError(
          `That track is longer than this room's limit of ${maxDurationMinutes} minute${maxDurationMinutes === 1 ? "" : "s"}.`,
          400,
        );
      }

      const maxSimultaneous = room.maxSimultaneousSubmissions ?? null;
      if (maxSimultaneous !== null) {
        const activeCount = await repo.countActiveByRoomAndParticipant(
          room.id,
          participant.id,
        );
        if (activeCount >= maxSimultaneous) {
          throw new AppError(
            `You already have ${activeCount} item${activeCount === 1 ? "" : "s"} in the queue (room limit is ${maxSimultaneous}).`,
            400,
          );
        }
      }

      const item = await repo.create({
        roomId: room.id,
        participantId: participant.id,
        type: input.type,
        externalId,
        title,
        thumbnailUrl,
      });

      await participants.touchLastActive(participant.id);
      await events.recordItemSubmitted(participant, title);
      publishQueueItemAdded(room.id, item);
      await skipVotes.publishStateForRoom(room.id);
      await volumeVotes.publishStateForRoom(room.id);
      return item;
    },

    /**
     * Soft-pop: mark the item finished so it leaves the active playlist without
     * deleting the Mongo record. Also sets room now-playing and resets skip/volume votes.
     */
    async pop(queueItemId: string): Promise<QueueItem> {
      const existing = await repo.findById(queueItemId);
      if (!existing) {
        throw new AppError("Queue item not found", 404);
      }

      if (existing.finished) {
        return existing;
      }

      const item = await repo.markFinished(queueItemId);
      if (!item) {
        throw new AppError("Queue item not found", 404);
      }

      const roomId = String(item.roomId);
      await skipVotes.resetForNowPlaying(roomId, item.id);
      await volumeVotes.resetForNowPlaying(roomId);

      const submitter = await participants.findById(String(item.participantId));
      await events.recordNowPlaying(
        submitter ?? {
          id: String(item.participantId),
          roomId,
          name: null,
          nameKey: null,
          role: ParticipantRole.GUEST,
          lastActiveAt: null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
        item.title,
      );

      publishQueueItemPopped(roomId, item);
      return item;
    },
  };
}

export const queueItemService = createQueueItemService();
export type QueueItemService = ReturnType<typeof createQueueItemService>;
