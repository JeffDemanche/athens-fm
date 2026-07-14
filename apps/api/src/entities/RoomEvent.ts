import "reflect-metadata";

import {
  getModelForClass,
  modelOptions,
  prop,
  type ReturnModelType,
} from "@typegoose/typegoose";
import { Types } from "mongoose";
import {
  Field,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from "type-graphql";
import { Participant, ParticipantRole } from "./Participant.js";
import { Room } from "./Room.js";

export enum RoomEventType {
  JOINED = "JOINED",
  LEFT = "LEFT",
}

registerEnumType(RoomEventType, {
  name: "RoomEventType",
  description: "Lifecycle events that participants emit in a room",
});

@ObjectType()
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "room_events",
  },
})
export class RoomEvent {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  @prop({ ref: () => Room, required: true, index: true, type: () => Types.ObjectId })
  roomId!: Types.ObjectId | string;

  @Field(() => ID)
  @prop({
    ref: () => Participant,
    required: true,
    index: true,
    type: () => Types.ObjectId,
  })
  participantId!: Types.ObjectId | string;

  /** Denormalized so leave events remain readable after the participant row is deleted. */
  @Field(() => ParticipantRole)
  @prop({
    required: true,
    enum: ParticipantRole,
    type: String,
  })
  participantRole!: ParticipantRole;

  @Field(() => RoomEventType)
  @prop({
    required: true,
    enum: RoomEventType,
    type: String,
  })
  type!: RoomEventType;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

export type RoomEventModelType = ReturnModelType<typeof RoomEvent>;

export const RoomEventModel: RoomEventModelType = getModelForClass(RoomEvent);
