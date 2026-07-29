import mongoose from "mongoose";
import {
  ParticipantModel,
  ParticipantRole,
  type Participant,
} from "../entities/Participant.js";
import { activeSince } from "../lib/activeParticipant.js";
import { participantNameKey } from "../lib/participantName.js";

function toParticipant(doc: {
  _id: mongoose.Types.ObjectId;
  roomId: string | mongoose.Types.ObjectId;
  name?: string | null;
  nameKey?: string | null;
  role: ParticipantRole;
  lastActiveAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Participant {
  return {
    id: String(doc._id),
    roomId: String(doc.roomId),
    name: doc.name ?? null,
    nameKey: doc.nameKey ?? null,
    role: doc.role,
    lastActiveAt: doc.lastActiveAt ?? null,
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

  /** Guest ids whose lastActiveAt is within the active TTL. */
  async findActiveGuestIds(
    roomId: string,
    since: Date = activeSince(),
  ): Promise<string[]> {
    if (!mongoose.isValidObjectId(roomId)) {
      return [];
    }

    const docs = await ParticipantModel.find({
      roomId,
      role: ParticipantRole.GUEST,
      lastActiveAt: { $gte: since },
    })
      .select({ _id: 1 })
      .exec();
    return docs.map((doc) => String(doc._id));
  },

  async countActiveGuests(
    roomId: string,
    since: Date = activeSince(),
  ): Promise<number> {
    if (!mongoose.isValidObjectId(roomId)) {
      return 0;
    }

    return ParticipantModel.countDocuments({
      roomId,
      role: ParticipantRole.GUEST,
      lastActiveAt: { $gte: since },
    }).exec();
  },

  async create(input: {
    roomId: string;
    name?: string | null;
    role: ParticipantRole;
    lastActiveAt?: Date | null;
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
      lastActiveAt: input.lastActiveAt ?? null,
    });
    return toParticipant(doc);
  },

  async touchLastActive(
    id: string,
    at: Date = new Date(),
  ): Promise<Participant | null> {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }

    const doc = await ParticipantModel.findByIdAndUpdate(
      id,
      { $set: { lastActiveAt: at } },
      { new: true },
    ).exec();
    return doc ? toParticipant(doc) : null;
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
