import "reflect-metadata";

import {
  getModelForClass,
  modelOptions,
  prop,
  type ReturnModelType,
} from "@typegoose/typegoose";
import { Types } from "mongoose";
import { GraphQLISODateTime, ID, Int, ObjectType, Field } from "type-graphql";
import {
  DEFAULT_SKIP_QUORUM_PERCENT,
  DEFAULT_VOLUME_QUORUM_PERCENT,
} from "../lib/roomSettings.js";
import { SHORT_ID_LENGTH } from "../lib/shortId.js";

@ObjectType()
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "rooms",
  },
})
export class Room {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  @prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: SHORT_ID_LENGTH,
    maxlength: SHORT_ID_LENGTH,
    match: /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/,
    type: String,
  })
  shortId!: string;

  @Field(() => String)
  @prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 120,
    type: String,
  })
  name!: string;

  /**
   * Soft-popped queue item currently playing on the host desk.
   * Optional / additive — existing rooms without this field are idle.
   */
  @Field(() => ID, { nullable: true })
  @prop({ required: false, type: () => Types.ObjectId })
  nowPlayingQueueItemId?: Types.ObjectId | string | null;

  /** Percent of active guests required to skip (1–100). */
  @Field(() => Int)
  @prop({
    required: true,
    default: DEFAULT_SKIP_QUORUM_PERCENT,
    min: 1,
    max: 100,
    type: Number,
  })
  skipQuorumPercent!: number;

  /** Percent of active guests required for a volume nudge (1–100). */
  @Field(() => Int)
  @prop({
    required: true,
    default: DEFAULT_VOLUME_QUORUM_PERCENT,
    min: 1,
    max: 100,
    type: Number,
  })
  volumeQuorumPercent!: number;

  /** Max media duration in minutes; null = unlimited. */
  @Field(() => Int, { nullable: true })
  @prop({ required: false, default: null, type: Number })
  maxSubmissionDurationMinutes?: number | null;

  /** Max unfinished queue items per guest; null = unlimited. */
  @Field(() => Int, { nullable: true })
  @prop({ required: false, default: null, type: Number })
  maxSimultaneousSubmissions?: number | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

export type RoomModelType = ReturnModelType<typeof Room>;

export const RoomModel: RoomModelType = getModelForClass(Room);
