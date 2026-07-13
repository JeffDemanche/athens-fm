import "dotenv/config";
import { createApp } from "./app.js";
import { connectMongo } from "./config/mongo.js";
import { connectRedis } from "./config/redis.js";

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
      console.log("[api] redis connected");
    } catch (error) {
      console.warn("[api] redis connection failed", error);
    }
  } else {
    console.warn("[api] REDIS_URL not set — starting without Redis");
  }

  const app = await createApp();
  app.listen(port, "0.0.0.0", () => {
    console.log(`[api] listening on http://0.0.0.0:${port}`);
    console.log(`[api] GraphQL at http://0.0.0.0:${port}/api/graphql`);
  });
}

void main();
