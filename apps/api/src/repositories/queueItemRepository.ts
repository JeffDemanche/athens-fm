import mongoose from "mongoose";
import {
  QueueItemModel,
  QueueItemType,
  type QueueItem,
} from "../entities/QueueItem.js";
import { buildEmbedUrl } from "../lib/mediaEmbed.js";

function toQueueItem(doc: {
  _id: mongoose.Types.ObjectId;
  roomId: string | mongoose.Types.ObjectId;
  participantId: string | mongoose.Types.ObjectId;
  type: QueueItemType;
  externalId: string;
  title: string;
  thumbnailUrl: string;
  createdAt: Date;
  updatedAt: Date;
}): QueueItem {
  return {
    id: String(doc._id),
    roomId: String(doc.roomId),
    participantId: String(doc.participantId),
    type: doc.type,
    externalId: doc.externalId,
    title: doc.title,
    thumbnailUrl: doc.thumbnailUrl,
    embedUrl: buildEmbedUrl(doc.type, doc.externalId),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const queueItemRepository = {
  async findByRoomId(roomId: string): Promise<QueueItem[]> {
    if (!mongoose.isValidObjectId(roomId)) {
      return [];
    }

    const docs = await QueueItemModel.find({ roomId })
      .sort({ createdAt: 1 })
      .exec();
    return docs.map((doc) => toQueueItem(doc));
  },

  async create(input: {
    roomId: string;
    participantId: string;
    type: QueueItemType;
    externalId: string;
    title: string;
    thumbnailUrl: string;
  }): Promise<QueueItem> {
    if (!mongoose.isValidObjectId(input.roomId)) {
      throw new Error("Invalid room id");
    }
    if (!mongoose.isValidObjectId(input.participantId)) {
      throw new Error("Invalid participant id");
    }

    const doc = await QueueItemModel.create({
      roomId: input.roomId,
      participantId: input.participantId,
      type: input.type,
      externalId: input.externalId,
      title: input.title,
      thumbnailUrl: input.thumbnailUrl,
    });
    return toQueueItem(doc);
  },
};

export type QueueItemRepository = typeof queueItemRepository;
