import mongoose from "mongoose";
import { RoomModel } from "../entities/Room.js";
import type { Room } from "../entities/Room.js";
import {
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings,
} from "../lib/roomSettings.js";
import {
  generateShortId,
  isShortId,
  normalizeShortId,
} from "../lib/shortId.js";

const SHORT_ID_ATTEMPTS = 8;

function toRoom(doc: {
  _id: mongoose.Types.ObjectId;
  shortId: string;
  name: string;
  nowPlayingQueueItemId?: string | mongoose.Types.ObjectId | null;
  skipQuorumPercent?: number | null;
  volumeQuorumPercent?: number | null;
  maxSubmissionDurationMinutes?: number | null;
  maxSimultaneousSubmissions?: number | null;
  createdAt: Date;
  updatedAt: Date;
}): Room {
  return {
    id: String(doc._id),
    shortId: doc.shortId,
    name: doc.name,
    nowPlayingQueueItemId: doc.nowPlayingQueueItemId
      ? String(doc.nowPlayingQueueItemId)
      : null,
    skipQuorumPercent:
      doc.skipQuorumPercent ?? DEFAULT_ROOM_SETTINGS.skipQuorumPercent,
    volumeQuorumPercent:
      doc.volumeQuorumPercent ?? DEFAULT_ROOM_SETTINGS.volumeQuorumPercent,
    maxSubmissionDurationMinutes:
      doc.maxSubmissionDurationMinutes ??
      DEFAULT_ROOM_SETTINGS.maxSubmissionDurationMinutes,
    maxSimultaneousSubmissions:
      doc.maxSimultaneousSubmissions ??
      DEFAULT_ROOM_SETTINGS.maxSimultaneousSubmissions,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export const roomRepository = {
  async findById(id: string): Promise<Room | null> {
    const normalized = normalizeShortId(id);

    if (isShortId(normalized)) {
      const byShortId = await RoomModel.findOne({ shortId: normalized }).exec();
      if (byShortId) {
        return toRoom(byShortId);
      }
    }

    if (!mongoose.isValidObjectId(id)) {
      return null;
    }

    const doc = await RoomModel.findById(id).exec();
    return doc ? toRoom(doc) : null;
  },

  async findAll(): Promise<Room[]> {
    const docs = await RoomModel.find().sort({ createdAt: -1 }).exec();
    return docs.map((doc) => toRoom(doc));
  },

  async create(input: { name: string }): Promise<Room> {
    for (let attempt = 0; attempt < SHORT_ID_ATTEMPTS; attempt += 1) {
      try {
        const doc = await RoomModel.create({
          name: input.name,
          shortId: generateShortId(),
          ...DEFAULT_ROOM_SETTINGS,
        });
        return toRoom(doc);
      } catch (error) {
        if (!isDuplicateKeyError(error) || attempt === SHORT_ID_ATTEMPTS - 1) {
          throw error;
        }
      }
    }

    throw new Error("Failed to allocate a unique room short ID");
  },

  async setNowPlaying(
    roomId: string,
    queueItemId: string | null,
  ): Promise<Room | null> {
    if (!mongoose.isValidObjectId(roomId)) {
      return null;
    }
    if (queueItemId !== null && !mongoose.isValidObjectId(queueItemId)) {
      throw new Error("Invalid queue item id");
    }

    const doc = await RoomModel.findByIdAndUpdate(
      roomId,
      { $set: { nowPlayingQueueItemId: queueItemId } },
      { new: true },
    ).exec();
    return doc ? toRoom(doc) : null;
  },

  async updateSettings(
    roomId: string,
    settings: RoomSettings,
  ): Promise<Room | null> {
    if (!mongoose.isValidObjectId(roomId)) {
      return null;
    }

    const doc = await RoomModel.findByIdAndUpdate(
      roomId,
      {
        $set: {
          skipQuorumPercent: settings.skipQuorumPercent,
          volumeQuorumPercent: settings.volumeQuorumPercent,
          maxSubmissionDurationMinutes: settings.maxSubmissionDurationMinutes,
          maxSimultaneousSubmissions: settings.maxSimultaneousSubmissions,
        },
      },
      { new: true },
    ).exec();
    return doc ? toRoom(doc) : null;
  },
};

export type RoomRepository = typeof roomRepository;
