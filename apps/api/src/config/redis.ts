import { Redis } from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  return client;
}

export async function connectRedis(url: string): Promise<Redis> {
  if (client) {
    return client;
  }

  client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });

  await client.ping();
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (!client) {
    return;
  }

  await client.quit();
  client = null;
}

export async function redisStatus(): Promise<"connected" | "disconnected"> {
  if (!client) {
    return "disconnected";
  }

  try {
    const pong = await client.ping();
    return pong === "PONG" ? "connected" : "disconnected";
  } catch {
    return "disconnected";
  }
}
