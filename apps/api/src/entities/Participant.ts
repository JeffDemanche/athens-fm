import "reflect-metadata";

import {
  getModelForClass,
  index,
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
import { Room } from "./Room.js";

export enum ParticipantRole {
  HOST = "HOST",
  GUEST = "GUEST",
}

registerEnumType(ParticipantRole, {
  name: "ParticipantRole",
  description: "Whether the participant hosts or listens in a room",
});

export const PARTICIPANT_NAME_MAX_LENGTH = 40;

@ObjectType()
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "participants",
  },
})
@index(
  { roomId: 1, nameKey: 1 },
  {
    unique: true,
    name: "participants_roomId_nameKey_unique",
    partialFilterExpression: { nameKey: { $type: "string" } },
  },
)
export class Participant {
  @Field(() => ID)
  id!: string;

  /** Mongo ObjectId on the document; GraphQL/service layer use string ids. */
  @Field(() => ID)
  @prop({ ref: () => Room, required: true, index: true, type: () => Types.ObjectId })
  roomId!: Types.ObjectId | string;

  /** Display name for guests only; hosts are unnamed desk operators. */
  @Field(() => String, { nullable: true })
  @prop({
    required: false,
    trim: true,
    minlength: 1,
    maxlength: PARTICIPANT_NAME_MAX_LENGTH,
    type: String,
  })
  name?: string | null;

  /** Lowercased guest name used for per-room uniqueness. */
  @prop({ required: false, type: String })
  nameKey?: string | null;

  @Field(() => ParticipantRole)
  @prop({
    required: true,
    enum: ParticipantRole,
    type: String,
  })
  role!: ParticipantRole;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

export type ParticipantModelType = ReturnModelType<typeof Participant>;

export const ParticipantModel: ParticipantModelType =
  getModelForClass(Participant);
