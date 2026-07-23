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
import { Participant } from "./Participant.js";
import { QueueItem } from "./QueueItem.js";
import { Room } from "./Room.js";

export enum VoteValue {
  UP = "UP",
  DOWN = "DOWN",
}

registerEnumType(VoteValue, {
  name: "VoteValue",
  description: "Direction of a participant vote on a queue item",
});

@ObjectType()
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "votes",
  },
})
@index(
  { queueItemId: 1, participantId: 1 },
  {
    unique: true,
    name: "votes_queueItemId_participantId_unique",
  },
)
export class Vote {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  @prop({ ref: () => Room, required: true, index: true, type: () => Types.ObjectId })
  roomId!: Types.ObjectId | string;

  @Field(() => ID)
  @prop({
    ref: () => QueueItem,
    required: true,
    index: true,
    type: () => Types.ObjectId,
  })
  queueItemId!: Types.ObjectId | string;

  @Field(() => ID)
  @prop({
    ref: () => Participant,
    required: true,
    index: true,
    type: () => Types.ObjectId,
  })
  participantId!: Types.ObjectId | string;

  @Field(() => VoteValue)
  @prop({
    required: true,
    enum: VoteValue,
    type: String,
  })
  value!: VoteValue;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

export type VoteModelType = ReturnModelType<typeof Vote>;

export const VoteModel: VoteModelType = getModelForClass(Vote);
