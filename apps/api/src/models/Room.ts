import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type RoomAttrs = {
  name: string;
};

export type RoomDocument = HydratedDocument<
  RoomAttrs & {
    createdAt: Date;
    updatedAt: Date;
  }
>;

const roomSchema = new Schema<RoomAttrs>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
  },
  {
    timestamps: true,
  },
);

export type RoomModel = Model<RoomAttrs>;

export const RoomModel: RoomModel =
  (mongoose.models.Room as RoomModel | undefined) ??
  mongoose.model<RoomAttrs>("Room", roomSchema);
