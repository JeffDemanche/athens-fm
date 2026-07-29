import mongoose from "mongoose";
import {
  RoomEventModel,
  RoomEventType,
  type RoomEvent,
} from "../entities/RoomEvent.js";
import { ParticipantRole } from "../entities/Participant.js";

function toRoomEvent(doc: {
  _id: mongoose.Types.ObjectId;
  roomId: string | mongoose.Types.ObjectId;
  participantId: string | mongoose.Types.ObjectId;
  participantName?: string | null;
  participantRole: ParticipantRole;
  type: RoomEventType;
  detail?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RoomEvent {
  return {
    id: String(doc._id),
    roomId: String(doc.roomId),
    participantId: String(doc.participantId),
    participantName: doc.participantName ?? null,
    participantRole: doc.participantRole,
    type: doc.type,
    detail: doc.detail ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const roomEventRepository = {
  async findByRoomId(roomId: string): Promise<RoomEvent[]> {
    if (!mongoose.isValidObjectId(roomId)) {
      return [];
    }

    const docs = await RoomEventModel.find({ roomId })
      .sort({ createdAt: 1 })
      .exec();
    return docs.map((doc) => toRoomEvent(doc));
  },

  /**
   * True when a BECAME_INACTIVE (or other type) was already recorded for this
   * participant at or after `since` — used to avoid duplicate inactivity posts
   * when the sweep lookback overlaps consecutive runs.
   */
  async existsForParticipantSince(input: {
    participantId: string;
    type: RoomEventType;
    since: Date;
  }): Promise<boolean> {
    if (!mongoose.isValidObjectId(input.participantId)) {
      return false;
    }

    const count = await RoomEventModel.countDocuments({
      participantId: input.participantId,
      type: input.type,
      createdAt: { $gte: input.since },
    }).exec();
    return count > 0;
  },

  async create(input: {
    roomId: string;
    participantId: string;
    participantName?: string | null;
    participantRole: ParticipantRole;
    type: RoomEventType;
    detail?: string | null;
  }): Promise<RoomEvent> {
    if (!mongoose.isValidObjectId(input.roomId)) {
      throw new Error("Invalid room id");
    }
    if (!mongoose.isValidObjectId(input.participantId)) {
      throw new Error("Invalid participant id");
    }

    const doc = await RoomEventModel.create({
      roomId: input.roomId,
      participantId: input.participantId,
      participantName: input.participantName ?? null,
      participantRole: input.participantRole,
      type: input.type,
      detail: input.detail ?? null,
    });
    return toRoomEvent(doc);
  },
};

export type RoomEventRepository = typeof roomEventRepository;
