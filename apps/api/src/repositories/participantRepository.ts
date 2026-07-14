import mongoose from "mongoose";
import {
  ParticipantModel,
  ParticipantRole,
  type Participant,
} from "../entities/Participant.js";

function toParticipant(doc: {
  _id: mongoose.Types.ObjectId;
  roomId: string | mongoose.Types.ObjectId;
  role: ParticipantRole;
  createdAt: Date;
  updatedAt: Date;
}): Participant {
  return {
    id: String(doc._id),
    roomId: String(doc.roomId),
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

  async create(input: {
    roomId: string;
    role: ParticipantRole;
  }): Promise<Participant> {
    if (!mongoose.isValidObjectId(input.roomId)) {
      throw new Error("Invalid room id");
    }

    const doc = await ParticipantModel.create({
      roomId: input.roomId,
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
