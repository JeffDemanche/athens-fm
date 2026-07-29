import "dotenv/config";
import "reflect-metadata";

import { connectMongo, disconnectMongo } from "../config/mongo.js";
import { runPendingMigrations } from "./runner.js";
import { migrationsSkipReason, shouldRunMigrations } from "./shouldRun.js";

async function main(): Promise<void> {
  if (!shouldRunMigrations()) {
    console.warn(
      `[migrate] skipping — ${migrationsSkipReason() ?? "disabled"}`,
    );
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("[migrate] MONGODB_URI is required");
    process.exitCode = 1;
    return;
  }

  await connectMongo(uri);
  try {
    const result = await runPendingMigrations();
    if (result.applied.length === 0) {
      console.log("[migrate] no pending migrations");
    } else {
      console.log(
        `[migrate] applied ${result.applied.length}: ${result.applied.join(", ")}`,
      );
    }
  } finally {
    await disconnectMongo();
  }
}

void main().catch((error: unknown) => {
  console.error("[migrate] failed", error);
  process.exitCode = 1;
});
