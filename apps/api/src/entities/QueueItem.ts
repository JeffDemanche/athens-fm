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
import { Participant } from "./Participant.js";
import { Room } from "./Room.js";

export enum QueueItemType {
  YOUTUBE = "YOUTUBE",
}

registerEnumType(QueueItemType, {
  name: "QueueItemType",
  description: "Embed provider for a queue item",
});

@ObjectType()
@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "queue_items",
  },
})
export class QueueItem {
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

  @Field(() => QueueItemType)
  @prop({
    required: true,
    enum: QueueItemType,
    type: String,
  })
  type!: QueueItemType;

  /** Provider-specific media id (e.g. YouTube video id). */
  @Field(() => String)
  @prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 128,
    type: String,
  })
  externalId!: string;

  /** Display title from the provider (e.g. YouTube Data API snippet.title). */
  @Field(() => String)
  @prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 300,
    type: String,
  })
  title!: string;

  /** Thumbnail image URL from the provider. */
  @Field(() => String)
  @prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 2048,
    type: String,
  })
  thumbnailUrl!: string;

  /** Resolved iframe src for this item's provider. Computed at the GraphQL layer. */
  @Field(() => String)
  embedUrl!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

export type QueueItemModelType = ReturnModelType<typeof QueueItem>;

export const QueueItemModel: QueueItemModelType = getModelForClass(QueueItem);
