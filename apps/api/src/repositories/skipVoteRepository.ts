import mongoose from "mongoose";
import { SkipVoteModel, type SkipVote } from "../entities/SkipVote.js";

function toSkipVote(doc: {
  _id: mongoose.Types.ObjectId;
  roomId: string | mongoose.Types.ObjectId;
  queueItemId: string | mongoose.Types.ObjectId;
  participantId: string | mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}): SkipVote {
  return {
    id: String(doc._id),
    roomId: String(doc.roomId),
    queueItemId: String(doc.queueItemId),
    participantId: String(doc.participantId),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const skipVoteRepository = {
  async findByRoomAndParticipant(
    roomId: string,
    participantId: string,
  ): Promise<SkipVote | null> {
    if (
      !mongoose.isValidObjectId(roomId) ||
      !mongoose.isValidObjectId(participantId)
    ) {
      return null;
    }

    const doc = await SkipVoteModel.findOne({ roomId, participantId }).exec();
    return doc ? toSkipVote(doc) : null;
  },

  async countByRoom(roomId: string): Promise<number> {
    if (!mongoose.isValidObjectId(roomId)) {
      return 0;
    }
    return SkipVoteModel.countDocuments({ roomId }).exec();
  },

  async countByRoomAndParticipants(
    roomId: string,
    participantIds: string[],
  ): Promise<number> {
    if (!mongoose.isValidObjectId(roomId) || participantIds.length === 0) {
      return 0;
    }
    const validIds = participantIds.filter((id) =>
      mongoose.isValidObjectId(id),
    );
    if (validIds.length === 0) {
      return 0;
    }
    return SkipVoteModel.countDocuments({
      roomId,
      participantId: { $in: validIds },
    }).exec();
  },

  async deleteByParticipant(participantId: string): Promise<number> {
    if (!mongoose.isValidObjectId(participantId)) {
      return 0;
    }
    const result = await SkipVoteModel.deleteMany({ participantId }).exec();
    return result.deletedCount ?? 0;
  },

  async upsert(input: {
    roomId: string;
    queueItemId: string;
    participantId: string;
  }): Promise<SkipVote> {
    if (!mongoose.isValidObjectId(input.roomId)) {
      throw new Error("Invalid room id");
    }
    if (!mongoose.isValidObjectId(input.queueItemId)) {
      throw new Error("Invalid queue item id");
    }
    if (!mongoose.isValidObjectId(input.participantId)) {
      throw new Error("Invalid participant id");
    }

    const doc = await SkipVoteModel.findOneAndUpdate(
      {
        roomId: input.roomId,
        participantId: input.participantId,
      },
      {
        $set: { queueItemId: input.queueItemId },
        $setOnInsert: {
          roomId: input.roomId,
          participantId: input.participantId,
        },
      },
      { new: true, upsert: true },
    ).exec();

    if (!doc) {
      throw new Error("Failed to upsert skip vote");
    }

    return toSkipVote(doc);
  },

  async deleteByRoomAndParticipant(
    roomId: string,
    participantId: string,
  ): Promise<SkipVote | null> {
    if (
      !mongoose.isValidObjectId(roomId) ||
      !mongoose.isValidObjectId(participantId)
    ) {
      return null;
    }

    const doc = await SkipVoteModel.findOneAndDelete({
      roomId,
      participantId,
    }).exec();
    return doc ? toSkipVote(doc) : null;
  },

  async deleteByRoom(roomId: string): Promise<number> {
    if (!mongoose.isValidObjectId(roomId)) {
      return 0;
    }
    const result = await SkipVoteModel.deleteMany({ roomId }).exec();
    return result.deletedCount ?? 0;
  },
};

export type SkipVoteRepository = typeof skipVoteRepository;
