import mongoose from "mongoose";
import {
  VolumeVoteDirection,
  VolumeVoteModel,
  type VolumeVote,
} from "../entities/VolumeVote.js";

function toVolumeVote(doc: {
  _id: mongoose.Types.ObjectId;
  roomId: string | mongoose.Types.ObjectId;
  queueItemId: string | mongoose.Types.ObjectId;
  participantId: string | mongoose.Types.ObjectId;
  value: VolumeVoteDirection;
  createdAt: Date;
  updatedAt: Date;
}): VolumeVote {
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

export const volumeVoteRepository = {
  async findByRoomAndParticipant(
    roomId: string,
    participantId: string,
  ): Promise<VolumeVote | null> {
    if (
      !mongoose.isValidObjectId(roomId) ||
      !mongoose.isValidObjectId(participantId)
    ) {
      return null;
    }

    const doc = await VolumeVoteModel.findOne({ roomId, participantId }).exec();
    return doc ? toVolumeVote(doc) : null;
  },

  async countByRoomParticipantsAndValue(
    roomId: string,
    participantIds: string[],
    value: VolumeVoteDirection,
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
    return VolumeVoteModel.countDocuments({
      roomId,
      participantId: { $in: validIds },
      value,
    }).exec();
  },

  async deleteByParticipant(participantId: string): Promise<number> {
    if (!mongoose.isValidObjectId(participantId)) {
      return 0;
    }
    const result = await VolumeVoteModel.deleteMany({ participantId }).exec();
    return result.deletedCount ?? 0;
  },

  async upsert(input: {
    roomId: string;
    queueItemId: string;
    participantId: string;
    value: VolumeVoteDirection;
  }): Promise<VolumeVote> {
    if (!mongoose.isValidObjectId(input.roomId)) {
      throw new Error("Invalid room id");
    }
    if (!mongoose.isValidObjectId(input.queueItemId)) {
      throw new Error("Invalid queue item id");
    }
    if (!mongoose.isValidObjectId(input.participantId)) {
      throw new Error("Invalid participant id");
    }

    const doc = await VolumeVoteModel.findOneAndUpdate(
      {
        roomId: input.roomId,
        participantId: input.participantId,
      },
      {
        $set: {
          queueItemId: input.queueItemId,
          value: input.value,
        },
        $setOnInsert: {
          roomId: input.roomId,
          participantId: input.participantId,
        },
      },
      { new: true, upsert: true },
    ).exec();

    if (!doc) {
      throw new Error("Failed to upsert volume vote");
    }

    return toVolumeVote(doc);
  },

  async deleteByRoomAndParticipant(
    roomId: string,
    participantId: string,
  ): Promise<VolumeVote | null> {
    if (
      !mongoose.isValidObjectId(roomId) ||
      !mongoose.isValidObjectId(participantId)
    ) {
      return null;
    }

    const doc = await VolumeVoteModel.findOneAndDelete({
      roomId,
      participantId,
    }).exec();
    return doc ? toVolumeVote(doc) : null;
  },

  async deleteByRoom(roomId: string): Promise<number> {
    if (!mongoose.isValidObjectId(roomId)) {
      return 0;
    }
    const result = await VolumeVoteModel.deleteMany({ roomId }).exec();
    return result.deletedCount ?? 0;
  },
};

export type VolumeVoteRepository = typeof volumeVoteRepository;
