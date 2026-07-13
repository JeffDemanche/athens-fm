import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? true,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ name: "athens-fm-api", status: "ok" });
  });

  app.use("/api/health", healthRouter);

  app.use(errorHandler);

  return app;
}

export default createApp();
