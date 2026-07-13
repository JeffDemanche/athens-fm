import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../apps/api/src/app.js";
import { connectMongo } from "../apps/api/src/config/mongo.js";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDatabase();
  return app(req, res);
}
