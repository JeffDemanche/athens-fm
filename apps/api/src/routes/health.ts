import { Router } from "express";
import mongoose from "mongoose";
import { redisStatus } from "../config/redis.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

  res.json({
    ok: true,
    service: "athens-fm-api",
    database: dbStatus,
    redis: await redisStatus(),
    timestamp: new Date().toISOString(),
  });
});
