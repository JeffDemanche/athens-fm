import { Arg, Ctx, FieldResolver, ID, Mutation, Query, Resolver, Root } from "type-graphql";
import { Participant } from "../../entities/Participant.js";
import { Room } from "../../entities/Room.js";
import type { GraphQLContext } from "../context.js";

@Resolver(() => Participant)
export class ParticipantResolver {
  @Query(() => Participant, { nullable: true })
  async participant(
    @Arg("id", () => ID) id: string,
    @Ctx() context: GraphQLContext,
  ): Promise<Participant | null> {
    return context.services.participant.getById(id);
  }

  @Mutation(() => Participant)
  async joinRoom(
    @Arg("roomId", () => ID) roomId: string,
    @Arg("name", () => String) name: string,
    @Ctx() context: GraphQLContext,
  ): Promise<Participant> {
    return context.services.participant.joinAsGuest(roomId, name);
  }

  @Mutation(() => Boolean)
  async leaveRoom(
    @Arg("participantId", () => ID) participantId: string,
    @Ctx() context: GraphQLContext,
  ): Promise<boolean> {
    return context.services.participant.leave(participantId);
  }

  @FieldResolver(() => Room, { nullable: true })
  async room(
    @Root() participant: Participant,
    @Ctx() context: GraphQLContext,
  ): Promise<Room | null> {
    return context.services.room.getById(String(participant.roomId));
  }
}
