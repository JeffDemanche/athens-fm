import mongoose from "mongoose";
import { RoomModel, type RoomDocument } from "../models/Room.js";
import type { Room } from "../types/room.js";

function toRoom(doc: RoomDocument): Room {
  return {
    id: String(doc._id),
    name: doc.name,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const roomRepository = {
  async findById(id: string): Promise<Room | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }

    const doc = await RoomModel.findById(id).exec();
    return doc ? toRoom(doc as RoomDocument) : null;
  },

  async findAll(): Promise<Room[]> {
    const docs = await RoomModel.find().sort({ createdAt: -1 }).exec();
    return docs.map((doc) => toRoom(doc as RoomDocument));
  },

  async create(input: { name: string }): Promise<Room> {
    const doc = (await RoomModel.create({ name: input.name })) as RoomDocument;
    return toRoom(doc);
  },
};

export type RoomRepository = typeof roomRepository;
