import { createRedisEventTarget } from "@graphql-yoga/redis-event-target";
import { createPubSub, type PubSub as YogaPubSub } from "@graphql-yoga/subscription";
import { Redis } from "ioredis";
import type { PubSub } from "type-graphql";
import type { RoomEvent } from "../entities/RoomEvent.js";

export const ROOM_EVENT_TOPIC = "ROOM_EVENT" as const;

type PubSubTopics = {
  [ROOM_EVENT_TOPIC]: [roomId: string, payload: RoomEvent];
};

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
    ensureEngine().publish(
      routingKey as typeof ROOM_EVENT_TOPIC,
      ...(args as [string, RoomEvent]),
    );
  },
  subscribe(routingKey: string, dynamicId?: unknown) {
    return ensureEngine().subscribe(
      routingKey as typeof ROOM_EVENT_TOPIC,
      dynamicId as string,
    );
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
