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

/** Stored volume vote direction (NONE is client-only and not persisted). */
export enum VolumeVoteDirection {
  UP = "UP",
  DOWN = "DOWN",
}

registerEnumType(VolumeVoteDirection, {
  name: "VolumeVoteDirection",
  description: "Direction of a volume nudge vote that reached quorum",
});

/**
 * Client-facing vote choice including explicit no-vote. NONE clears the
 * persisted vote and is never stored on VolumeVote documents.
 */
export enum VolumeVoteValue {
  UP = "UP",
  DOWN = "DOWN",
  NONE = "NONE",
}

registerEnumType(VolumeVoteValue, {
  name: "VolumeVoteValue",
  description: "Participant volume vote: turn up, turn down, or no vote",
});

/**
 * One volume vote per participant per room. Cleared on soft-pop, idle clear,
 * or after the host acknowledges a successful nudge.
 */
@ObjectType()
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "volume_votes",
  },
})
@index(
  { roomId: 1, participantId: 1 },
  {
    unique: true,
    name: "volume_votes_roomId_participantId_unique",
  },
)
export class VolumeVote {
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

  @Field(() => VolumeVoteDirection)
  @prop({
    required: true,
    enum: VolumeVoteDirection,
    type: String,
  })
  value!: VolumeVoteDirection;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

export type VolumeVoteModelType = ReturnModelType<typeof VolumeVote>;

export const VolumeVoteModel: VolumeVoteModelType =
  getModelForClass(VolumeVote);
