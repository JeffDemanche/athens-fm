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
  finished?: boolean;
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
    finished: doc.finished ?? false,
    embedUrl: buildEmbedUrl(doc.type, doc.externalId),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const queueItemRepository = {
  async findActiveByRoomId(roomId: string): Promise<QueueItem[]> {
    if (!mongoose.isValidObjectId(roomId)) {
      return [];
    }

    const docs = await QueueItemModel.find({
      roomId,
      finished: { $ne: true },
    })
      .sort({ createdAt: 1 })
      .exec();
    return docs.map((doc) => toQueueItem(doc));
  },

  async findById(id: string): Promise<QueueItem | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }

    const doc = await QueueItemModel.findById(id).exec();
    return doc ? toQueueItem(doc) : null;
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
      finished: false,
    });
    return toQueueItem(doc);
  },

  async markFinished(id: string): Promise<QueueItem | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }

    const doc = await QueueItemModel.findByIdAndUpdate(
      id,
      { $set: { finished: true } },
      { new: true },
    ).exec();
    return doc ? toQueueItem(doc) : null;
  },
};

export type QueueItemRepository = typeof queueItemRepository;
