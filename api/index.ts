import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";
import { createApp } from "../apps/api/src/app.js";
import { connectMongo } from "../apps/api/src/config/mongo.js";

let appPromise: Promise<Express> | null = null;
let dbReady: Promise<void> | null = null;

function ensureDatabase(): Promise<void> {
  if (!dbReady) {
    dbReady = (async () => {
      const uri = process.env.MONGODB_URI;
      if (uri) {
        await connectMongo(uri);
      }
    })();
  }
  return dbReady;
}

function ensureApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDatabase();
  const app = await ensureApp();
  return app(req, res);
}
