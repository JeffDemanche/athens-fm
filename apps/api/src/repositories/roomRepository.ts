import mongoose from "mongoose";
import { RoomModel } from "../entities/Room.js";
import type { Room } from "../entities/Room.js";
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
  createdAt: Date;
  updatedAt: Date;
}): Room {
  return {
    id: String(doc._id),
    shortId: doc.shortId,
    name: doc.name,
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
};

export type RoomRepository = typeof roomRepository;
