import {
  Arg,
  Ctx,
  FieldResolver,
  ID,
  Query,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";
import { Participant } from "../../entities/Participant.js";
import { RoomEvent } from "../../entities/RoomEvent.js";
import type { GraphQLContext } from "../context.js";
import { pubSub, ROOM_EVENT_TOPIC } from "../pubsub.js";

function rehydrateRoomEvent(payload: RoomEvent): RoomEvent {
  return {
    ...payload,
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
  };
}

@Resolver(() => RoomEvent)
export class RoomEventResolver {
  @Query(() => [RoomEvent])
  async roomEvents(
    @Arg("roomId", () => ID) roomId: string,
    @Ctx() context: GraphQLContext,
  ): Promise<RoomEvent[]> {
    return context.services.roomEvent.listByRoom(roomId);
  }

  @Subscription(() => RoomEvent, {
    subscribe: async ({ args, context }) => {
      const room = await (context as GraphQLContext).services.room.getById(
        args.roomId as string,
      );
      if (!room) {
        throw new Error("Room not found");
      }
      return pubSub.subscribe(ROOM_EVENT_TOPIC, room.id);
    },
  })
  roomEventAdded(
    @Root() payload: RoomEvent,
    @Arg("roomId", () => ID) _roomId: string,
  ): RoomEvent {
    return rehydrateRoomEvent(payload);
  }

  @FieldResolver(() => Participant, { nullable: true })
  async participant(
    @Root() event: RoomEvent,
    @Ctx() context: GraphQLContext,
  ): Promise<Participant | null> {
    return context.services.participant.getById(String(event.participantId));
  }
}
