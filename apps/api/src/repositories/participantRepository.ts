import mongoose from "mongoose";
import {
  ParticipantModel,
  ParticipantRole,
  type Participant,
} from "../entities/Participant.js";
import { participantNameKey } from "../lib/participantName.js";

function toParticipant(doc: {
  _id: mongoose.Types.ObjectId;
  roomId: string | mongoose.Types.ObjectId;
  name?: string | null;
  nameKey?: string | null;
  role: ParticipantRole;
  createdAt: Date;
  updatedAt: Date;
}): Participant {
  return {
    id: String(doc._id),
    roomId: String(doc.roomId),
    name: doc.name ?? null,
    nameKey: doc.nameKey ?? null,
    role: doc.role,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const participantRepository = {
  async findById(id: string): Promise<Participant | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }

    const doc = await ParticipantModel.findById(id).exec();
    return doc ? toParticipant(doc) : null;
  },

  async findByRoomId(roomId: string): Promise<Participant[]> {
    if (!mongoose.isValidObjectId(roomId)) {
      return [];
    }

    const docs = await ParticipantModel.find({ roomId })
      .sort({ createdAt: 1 })
      .exec();
    return docs.map((doc) => toParticipant(doc));
  },

  async findByRoomIdAndNameKey(
    roomId: string,
    nameKey: string,
  ): Promise<Participant | null> {
    if (!mongoose.isValidObjectId(roomId)) {
      return null;
    }

    const doc = await ParticipantModel.findOne({ roomId, nameKey }).exec();
    return doc ? toParticipant(doc) : null;
  },

  async create(input: {
    roomId: string;
    name?: string | null;
    role: ParticipantRole;
  }): Promise<Participant> {
    if (!mongoose.isValidObjectId(input.roomId)) {
      throw new Error("Invalid room id");
    }

    const name = input.name ?? null;
    const doc = await ParticipantModel.create({
      roomId: input.roomId,
      name,
      nameKey: name ? participantNameKey(name) : null,
      role: input.role,
    });
    return toParticipant(doc);
  },

  async deleteById(id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(id)) {
      return false;
    }

    const result = await ParticipantModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  },
};

export type ParticipantRepository = typeof participantRepository;
