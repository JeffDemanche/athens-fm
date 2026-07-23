import { createServer, type Server } from "node:http";
import { attachDatabasePool } from "@vercel/functions";
import type { Redis } from "ioredis";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectMongo } from "./config/mongo.js";
import { connectRedis, getRedis } from "./config/redis.js";
import { getPubSubRedisClients, initPubSub } from "./graphql/pubsub.js";
import { startSubscriptionServer } from "./graphql/subscriptions.js";

function attachPool(client: unknown, label: string): void {
  try {
    attachDatabasePool(client as Parameters<typeof attachDatabasePool>[0]);
  } catch (error) {
    console.warn(`[api] attachDatabasePool skipped for ${label}`, error);
  }
}

function attachRedisPools(clients: Redis[]): void {
  for (const client of clients) {
    attachPool(client, "redis");
  }
}

/**
 * Build the shared HTTP server (Express + GraphQL HTTP + graphql-ws).
 * Used by the Docker/local entry (`listen`) and the Vercel export (`export default`).
 */
export async function createHttpServer(): Promise<Server> {
  if (process.env.MONGODB_URI) {
    await connectMongo(process.env.MONGODB_URI);
    attachPool(mongoose.connection.getClient(), "mongodb");
  } else {
    console.warn(
      "[api] MONGODB_URI not set — starting without a database connection",
    );
  }

  if (process.env.REDIS_URL) {
    try {
      await connectRedis(process.env.REDIS_URL);
      initPubSub(process.env.REDIS_URL);
      const redisClients = [getRedis(), ...getPubSubRedisClients()].filter(
        (client): client is Redis => client != null,
      );
      attachRedisPools(redisClients);
      console.log("[api] redis connected (cache + graphql pub/sub)");
    } catch (error) {
      console.warn(
        "[api] redis connection failed — using in-memory pub/sub",
        error,
      );
      initPubSub();
    }
  } else {
    console.warn("[api] REDIS_URL not set — using in-memory GraphQL pub/sub");
    initPubSub();
  }

  const app = await createApp();
  const httpServer = createServer(app);
  await startSubscriptionServer(httpServer);
  return httpServer;
}
