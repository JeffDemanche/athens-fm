import {
  QueueItemType,
  type QueueItem,
} from "../entities/QueueItem.js";
import { publishQueueItem } from "../graphql/pubsub.js";
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

export function createQueueItemService(
  repo: QueueItemRepository = queueItemRepository,
  rooms: RoomRepository = roomRepository,
  participants: ParticipantRepository = participantRepository,
  metadata: MediaMetadataProvider = mediaMetadataProvider,
) {
  return {
    async listByRoom(roomIdOrShortId: string): Promise<QueueItem[]> {
      const room = await rooms.findById(roomIdOrShortId);
      if (!room) {
        return [];
      }
      return repo.findByRoomId(room.id);
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
      const { title, thumbnailUrl } = await metadata.fetch(
        input.type,
        externalId,
      );

      const item = await repo.create({
        roomId: room.id,
        participantId: participant.id,
        type: input.type,
        externalId,
        title,
        thumbnailUrl,
      });

      publishQueueItem(room.id, item);
      return item;
    },
  };
}

export const queueItemService = createQueueItemService();
export type QueueItemService = ReturnType<typeof createQueueItemService>;
