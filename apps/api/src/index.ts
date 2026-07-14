import "dotenv/config";
import "reflect-metadata";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { connectMongo } from "./config/mongo.js";
import { connectRedis } from "./config/redis.js";
import { initPubSub } from "./graphql/pubsub.js";
import { startSubscriptionServer } from "./graphql/subscriptions.js";

const port = Number(process.env.PORT ?? 3001);

async function main() {
  if (process.env.MONGODB_URI) {
    await connectMongo(process.env.MONGODB_URI);
  } else {
    console.warn(
      "[api] MONGODB_URI not set — starting without a database connection",
    );
  }

  if (process.env.REDIS_URL) {
    try {
      await connectRedis(process.env.REDIS_URL);
      initPubSub(process.env.REDIS_URL);
      console.log("[api] redis connected (cache + graphql pub/sub)");
    } catch (error) {
      console.warn("[api] redis connection failed — using in-memory pub/sub", error);
      initPubSub();
    }
  } else {
    console.warn("[api] REDIS_URL not set — using in-memory GraphQL pub/sub");
    initPubSub();
  }

  const app = await createApp();
  const httpServer = createServer(app);
  await startSubscriptionServer(httpServer);

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`[api] listening on http://0.0.0.0:${port}`);
    console.log(`[api] GraphQL HTTP/WS at http://0.0.0.0:${port}/api/graphql`);
  });
}

void main();
