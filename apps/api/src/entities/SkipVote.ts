import "reflect-metadata";

import {
  getModelForClass,
  index,
  modelOptions,
  prop,
  type ReturnModelType,
} from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, GraphQLISODateTime, ID, ObjectType } from "type-graphql";
import { Participant } from "./Participant.js";
import { QueueItem } from "./QueueItem.js";
import { Room } from "./Room.js";

/**
 * One skip intent per participant per room. Cleared whenever the next track
 * starts (soft-pop). Targets the room's current now-playing queue item.
 */
@ObjectType()
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "skip_votes",
  },
})
@index(
  { roomId: 1, participantId: 1 },
  {
    unique: true,
    name: "skip_votes_roomId_participantId_unique",
  },
)
export class SkipVote {
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

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

export type SkipVoteModelType = ReturnModelType<typeof SkipVote>;

export const SkipVoteModel: SkipVoteModelType = getModelForClass(SkipVote);
