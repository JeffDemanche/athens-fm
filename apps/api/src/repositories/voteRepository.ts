import mongoose from "mongoose";
import { VoteModel, VoteValue, type Vote } from "../entities/Vote.js";

function toVote(doc: {
  _id: mongoose.Types.ObjectId;
  roomId: string | mongoose.Types.ObjectId;
  queueItemId: string | mongoose.Types.ObjectId;
  participantId: string | mongoose.Types.ObjectId;
  value: VoteValue;
  createdAt: Date;
  updatedAt: Date;
}): Vote {
  return {
    id: String(doc._id),
    roomId: String(doc.roomId),
    queueItemId: String(doc.queueItemId),
    participantId: String(doc.participantId),
    value: doc.value,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const voteRepository = {
  async findByQueueItemAndParticipant(
    queueItemId: string,
    participantId: string,
  ): Promise<Vote | null> {
    if (
      !mongoose.isValidObjectId(queueItemId) ||
      !mongoose.isValidObjectId(participantId)
    ) {
      return null;
    }

    const doc = await VoteModel.findOne({ queueItemId, participantId }).exec();
    return doc ? toVote(doc) : null;
  },

  async findByRoomAndParticipant(
    roomId: string,
    participantId: string,
  ): Promise<Vote[]> {
    if (
      !mongoose.isValidObjectId(roomId) ||
      !mongoose.isValidObjectId(participantId)
    ) {
      return [];
    }

    const docs = await VoteModel.find({ roomId, participantId }).exec();
    return docs.map((doc) => toVote(doc));
  },

  async upsert(input: {
    roomId: string;
    queueItemId: string;
    participantId: string;
    value: VoteValue;
  }): Promise<Vote> {
    if (!mongoose.isValidObjectId(input.roomId)) {
      throw new Error("Invalid room id");
    }
    if (!mongoose.isValidObjectId(input.queueItemId)) {
      throw new Error("Invalid queue item id");
    }
    if (!mongoose.isValidObjectId(input.participantId)) {
      throw new Error("Invalid participant id");
    }

    const doc = await VoteModel.findOneAndUpdate(
      {
        queueItemId: input.queueItemId,
        participantId: input.participantId,
      },
      {
        $set: { value: input.value },
        $setOnInsert: {
          roomId: input.roomId,
          queueItemId: input.queueItemId,
          participantId: input.participantId,
        },
      },
      { new: true, upsert: true },
    ).exec();

    if (!doc) {
      throw new Error("Failed to upsert vote");
    }

    return toVote(doc);
  },

  async deleteByQueueItemAndParticipant(
    queueItemId: string,
    participantId: string,
  ): Promise<Vote | null> {
    if (
      !mongoose.isValidObjectId(queueItemId) ||
      !mongoose.isValidObjectId(participantId)
    ) {
      return null;
    }

    const doc = await VoteModel.findOneAndDelete({
      queueItemId,
      participantId,
    }).exec();
    return doc ? toVote(doc) : null;
  },
};

export type VoteRepository = typeof voteRepository;
