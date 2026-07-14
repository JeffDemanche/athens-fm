import "reflect-metadata";

import { expressMiddleware } from "@as-integrations/express5";
import cors from "cors";
import express from "express";
import { createGraphQLContext } from "./graphql/context.js";
import { createApolloServer } from "./graphql/server.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";

export async function createApp() {
  const app = express();
  const apollo = await createApolloServer();
  await apollo.start();

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

  app.use(
    "/api/graphql",
    expressMiddleware(apollo, {
      context: async () => createGraphQLContext(),
    }),
  );

  app.use(errorHandler);

  return app;
}
