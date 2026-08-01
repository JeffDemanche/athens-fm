import { Arg, Ctx, FieldResolver, ID, Mutation, Query, Resolver, Root } from "type-graphql";
import { CreateRoomPayload } from "../../entities/CreateRoomPayload.js";
import { Participant } from "../../entities/Participant.js";
import { QueueItem } from "../../entities/QueueItem.js";
import { Room } from "../../entities/Room.js";
import { RoomEvent } from "../../entities/RoomEvent.js";
import { RoomSettingsInput } from "../../entities/RoomSettingsInput.js";
import type { GraphQLContext } from "../context.js";

@Resolver(() => Room)
export class RoomResolver {
  @Query(() => Room, { nullable: true })
  async room(
    @Arg("id", () => ID) id: string,
    @Ctx() context: GraphQLContext,
  ): Promise<Room | null> {
    return context.services.room.getById(id);
  }

  @Query(() => [Room])
  async rooms(@Ctx() context: GraphQLContext): Promise<Room[]> {
    return context.services.room.list();
  }

  @Mutation(() => CreateRoomPayload)
  async createRoom(
    @Arg("name", () => String) name: string,
    @Ctx() context: GraphQLContext,
  ): Promise<CreateRoomPayload> {
    const room = await context.services.room.create(name);
    const participant = await context.services.participant.joinAsHost(room.id);
    return { room, participant };
  }

  @Mutation(() => Room)
  async updateRoomSettings(
    @Arg("participantId", () => ID) participantId: string,
    @Arg("input", () => RoomSettingsInput) input: RoomSettingsInput,
    @Ctx() context: GraphQLContext,
  ): Promise<Room> {
    return context.services.room.updateSettings(participantId, input);
  }

  @FieldResolver(() => [Participant])
  async participants(
    @Root() room: Room,
    @Ctx() context: GraphQLContext,
  ): Promise<Participant[]> {
    return context.services.participant.listByRoom(room.id);
  }

  @FieldResolver(() => [RoomEvent])
  async events(
    @Root() room: Room,
    @Ctx() context: GraphQLContext,
  ): Promise<RoomEvent[]> {
    return context.services.roomEvent.listByRoom(room.id);
  }

  @FieldResolver(() => [QueueItem])
  async queueItems(
    @Root() room: Room,
    @Ctx() context: GraphQLContext,
  ): Promise<QueueItem[]> {
    return context.services.queueItem.listByRoom(room.id);
  }

  /** Soft-popped track currently playing on the host desk. */
  @FieldResolver(() => QueueItem, { nullable: true })
  async nowPlaying(
    @Root() room: Room,
    @Ctx() context: GraphQLContext,
  ): Promise<QueueItem | null> {
    if (!room.nowPlayingQueueItemId) {
      return null;
    }
    return context.services.queueItem.getById(
      String(room.nowPlayingQueueItemId),
    );
  }
}
