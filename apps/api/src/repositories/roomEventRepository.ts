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

  async create(input: {
    roomId: string;
    participantId: string;
    participantName?: string | null;
    participantRole: ParticipantRole;
    type: RoomEventType;
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
    });
    return toRoomEvent(doc);
  },
};

export type RoomEventRepository = typeof roomEventRepository;
