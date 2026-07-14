import "reflect-metadata";

import {
  getModelForClass,
  modelOptions,
  prop,
  type ReturnModelType,
} from "@typegoose/typegoose";
import { GraphQLISODateTime, ID, ObjectType, Field } from "type-graphql";
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

  @Field()
  @prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: SHORT_ID_LENGTH,
    maxlength: SHORT_ID_LENGTH,
    match: /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/,
  })
  shortId!: string;

  @Field()
  @prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 120,
  })
  name!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

export type RoomModelType = ReturnModelType<typeof Room>;

export const RoomModel: RoomModelType = getModelForClass(Room);
