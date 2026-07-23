import {
  Arg,
  Ctx,
  FieldResolver,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";
import { Participant } from "../../entities/Participant.js";
import { QueueItem, QueueItemType } from "../../entities/QueueItem.js";
import { VoteValue } from "../../entities/Vote.js";
import { buildEmbedUrl } from "../../lib/mediaEmbed.js";
import type { GraphQLContext } from "../context.js";
import {
  pubSub,
  QUEUE_ITEM_ADDED_TOPIC,
  QUEUE_ITEM_POPPED_TOPIC,
  QUEUE_ITEM_UPDATED_TOPIC,
} from "../pubsub.js";

function rehydrateQueueItem(payload: QueueItem): QueueItem {
  return {
    ...payload,
    finished: Boolean(payload.finished),
    score: payload.score ?? 0,
    embedUrl: buildEmbedUrl(payload.type, payload.externalId),
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
  };
}

@Resolver(() => QueueItem)
export class QueueItemResolver {
  @Query(() => [QueueItem])
  async queueItems(
    @Arg("roomId", () => ID) roomId: string,
    @Ctx() context: GraphQLContext,
  ): Promise<QueueItem[]> {
    return context.services.queueItem.listByRoom(roomId);
  }

  @Mutation(() => QueueItem)
  async addQueueItem(
    @Arg("participantId", () => ID) participantId: string,
    @Arg("type", () => QueueItemType) type: QueueItemType,
    @Arg("mediaRef", () => String) mediaRef: string,
    @Ctx() context: GraphQLContext,
  ): Promise<QueueItem> {
    return context.services.queueItem.add({
      participantId,
      type,
      mediaRef,
    });
  }

  @Mutation(() => QueueItem)
  async popQueueItem(
    @Arg("id", () => ID) id: string,
    @Ctx() context: GraphQLContext,
  ): Promise<QueueItem> {
    return context.services.queueItem.pop(id);
  }

  @Subscription(() => QueueItem, {
    subscribe: async ({ args, context }) => {
      const room = await (context as GraphQLContext).services.room.getById(
        args.roomId as string,
      );
      if (!room) {
        throw new Error("Room not found");
      }
      return pubSub.subscribe(QUEUE_ITEM_ADDED_TOPIC, room.id);
    },
  })
  queueItemAdded(
    @Root() payload: QueueItem,
    @Arg("roomId", () => ID) _roomId: string,
  ): QueueItem {
    return rehydrateQueueItem(payload);
  }

  @Subscription(() => QueueItem, {
    subscribe: async ({ args, context }) => {
      const room = await (context as GraphQLContext).services.room.getById(
        args.roomId as string,
      );
      if (!room) {
        throw new Error("Room not found");
      }
      return pubSub.subscribe(QUEUE_ITEM_POPPED_TOPIC, room.id);
    },
  })
  queueItemPopped(
    @Root() payload: QueueItem,
    @Arg("roomId", () => ID) _roomId: string,
  ): QueueItem {
    return rehydrateQueueItem(payload);
  }

  @Subscription(() => QueueItem, {
    subscribe: async ({ args, context }) => {
      const room = await (context as GraphQLContext).services.room.getById(
        args.roomId as string,
      );
      if (!room) {
        throw new Error("Room not found");
      }
      return pubSub.subscribe(QUEUE_ITEM_UPDATED_TOPIC, room.id);
    },
  })
  queueItemUpdated(
    @Root() payload: QueueItem,
    @Arg("roomId", () => ID) _roomId: string,
  ): QueueItem {
    return rehydrateQueueItem(payload);
  }

  @FieldResolver(() => String)
  embedUrl(@Root() item: QueueItem): string {
    return item.embedUrl ?? buildEmbedUrl(item.type, item.externalId);
  }

  @FieldResolver(() => VoteValue, { nullable: true })
  async viewerVote(
    @Root() item: QueueItem,
    @Arg("participantId", () => ID, { nullable: true })
    participantId: string | null,
    @Ctx() context: GraphQLContext,
  ): Promise<VoteValue | null> {
    if (!participantId) {
      return null;
    }
    return context.services.vote.getViewerVote(item.id, participantId);
  }

  @FieldResolver(() => Participant, { nullable: true })
  async participant(
    @Root() item: QueueItem,
    @Ctx() context: GraphQLContext,
  ): Promise<Participant | null> {
    return context.services.participant.getById(String(item.participantId));
  }
}
