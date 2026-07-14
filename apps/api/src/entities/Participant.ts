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
import { Room } from "./Room.js";

export enum ParticipantRole {
  HOST = "HOST",
  GUEST = "GUEST",
}

registerEnumType(ParticipantRole, {
  name: "ParticipantRole",
  description: "Whether the participant hosts or listens in a room",
});

@ObjectType()
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "participants",
  },
})
export class Participant {
  @Field(() => ID)
  id!: string;

  /** Mongo ObjectId on the document; GraphQL/service layer use string ids. */
  @Field(() => ID)
  @prop({ ref: () => Room, required: true, index: true, type: () => Types.ObjectId })
  roomId!: Types.ObjectId | string;

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
