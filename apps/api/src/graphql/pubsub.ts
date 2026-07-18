import { createRedisEventTarget } from "@graphql-yoga/redis-event-target";
import { createPubSub, type PubSub as YogaPubSub } from "@graphql-yoga/subscription";
import { Redis } from "ioredis";
import type { PubSub } from "type-graphql";
import type { QueueItem } from "../entities/QueueItem.js";
import type { RoomEvent } from "../entities/RoomEvent.js";

export const ROOM_EVENT_TOPIC = "ROOM_EVENT" as const;
export const QUEUE_ITEM_TOPIC = "QUEUE_ITEM" as const;

type PubSubTopics = {
  [ROOM_EVENT_TOPIC]: [roomId: string, payload: RoomEvent];
  [QUEUE_ITEM_TOPIC]: [roomId: string, payload: QueueItem];
};

type TopicName = keyof PubSubTopics;

type RoomPubSub = YogaPubSub<PubSubTopics>;

let publisher: Redis | null = null;
let subscriber: Redis | null = null;
let engine: RoomPubSub | null = null;

function createMemoryEngine(): RoomPubSub {
  return createPubSub<PubSubTopics>();
}

function createRedisEngine(url: string): RoomPubSub {
  publisher = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });
  subscriber = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });

  return createPubSub<PubSubTopics>({
    eventTarget: createRedisEventTarget({
      publishClient: publisher,
      subscribeClient: subscriber,
    }),
  });
}

/** Initialize (or re-init) the pub/sub engine. Prefer Redis when a URL is provided. */
export function initPubSub(redisUrl?: string): RoomPubSub {
  engine = redisUrl ? createRedisEngine(redisUrl) : createMemoryEngine();
  return engine;
}

function ensureEngine(): RoomPubSub {
  if (!engine) {
    engine = createMemoryEngine();
  }
  return engine;
}

/**
 * Stable PubSub facade for TypeGraphQL `buildSchema`.
 * Delegates to the current engine so Redis can be wired after process start.
 */
export const pubSub: PubSub = {
  publish(routingKey: string, ...args: unknown[]) {
    const topic = routingKey as TopicName;
    ensureEngine().publish(topic, ...(args as PubSubTopics[typeof topic]));
  },
  subscribe(routingKey: string, dynamicId?: unknown) {
    return ensureEngine().subscribe(routingKey as TopicName, dynamicId as string);
  },
};

export async function disconnectPubSub(): Promise<void> {
  const closing = [publisher, subscriber].filter(Boolean) as Redis[];
  publisher = null;
  subscriber = null;
  engine = createMemoryEngine();

  await Promise.all(
    closing.map(async (client) => {
      try {
        await client.quit();
      } catch {
        client.disconnect();
      }
    }),
  );
}

export function publishRoomEvent(roomId: string, event: RoomEvent): void {
  pubSub.publish(ROOM_EVENT_TOPIC, roomId, event);
}

export function publishQueueItem(roomId: string, item: QueueItem): void {
  pubSub.publish(QUEUE_ITEM_TOPIC, roomId, item);
}
