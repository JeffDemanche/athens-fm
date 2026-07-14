import { Field, ObjectType } from "type-graphql";
import { Participant } from "./Participant.js";
import { Room } from "./Room.js";

@ObjectType()
export class CreateRoomPayload {
  @Field(() => Room)
  room!: Room;

  @Field(() => Participant)
  participant!: Participant;
}
