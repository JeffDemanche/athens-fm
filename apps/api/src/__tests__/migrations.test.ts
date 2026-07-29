import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectMongo, disconnectMongo } from "../config/mongo.js";
import {
  MIGRATION_LOCK_COLLECTION,
  MIGRATIONS_COLLECTION,
  runPendingMigrations,
} from "../migrations/runner.js";
import type { Migration } from "../migrations/types.js";

describe("runPendingMigrations", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connectMongo(mongo.getUri());
  });

  afterAll(async () => {
    await disconnectMongo();
    await mongo.stop();
  });

  afterEach(async () => {
    const db = mongoose.connection.db;
    if (!db) {
      return;
    }
    await db.collection(MIGRATIONS_COLLECTION).deleteMany({});
    await db.collection(MIGRATION_LOCK_COLLECTION).deleteMany({});
    await db.collection("rooms").deleteMany({});
  });

  it("applies pending migrations once and records them", async () => {
    const db = mongoose.connection.db!;
    await db.collection("rooms").insertOne({
      shortId: "ABCDE",
      name: "Legacy Room",
      // old shape: missing optional field the migration backfills
    });

    const migrations: Migration[] = [
      {
        id: "20260728_001_backfill_room_legacy_flag",
        description: "Set legacyFlag on rooms that lack it",
        up: async ({ db: migrationDb }) => {
          await migrationDb.collection("rooms").updateMany(
            { legacyFlag: { $exists: false } },
            { $set: { legacyFlag: true } },
          );
        },
      },
    ];

    const first = await runPendingMigrations({ migrations });
    expect(first.applied).toEqual(["20260728_001_backfill_room_legacy_flag"]);
    expect(first.skipped).toEqual([]);

    const room = await db.collection("rooms").findOne({ shortId: "ABCDE" });
    expect(room).toMatchObject({ legacyFlag: true });

    const recorded = await db
      .collection(MIGRATIONS_COLLECTION)
      .find({})
      .toArray();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?._id).toBe("20260728_001_backfill_room_legacy_flag");

    const second = await runPendingMigrations({ migrations });
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual([
      "20260728_001_backfill_room_legacy_flag",
    ]);
  });

  it("applies migrations in registry order", async () => {
    const order: string[] = [];
    const migrations: Migration[] = [
      {
        id: "20260728_001_first",
        description: "first",
        up: async () => {
          order.push("first");
        },
      },
      {
        id: "20260728_002_second",
        description: "second",
        up: async () => {
          order.push("second");
        },
      },
    ];

    const result = await runPendingMigrations({ migrations });
    expect(result.applied).toEqual([
      "20260728_001_first",
      "20260728_002_second",
    ]);
    expect(order).toEqual(["first", "second"]);
  });

  it("does not mark a migration applied when up throws", async () => {
    const migrations: Migration[] = [
      {
        id: "20260728_001_boom",
        description: "fails on purpose",
        up: async () => {
          throw new Error("boom");
        },
      },
    ];

    await expect(runPendingMigrations({ migrations })).rejects.toThrow("boom");

    const recorded = await mongoose.connection
      .db!.collection(MIGRATIONS_COLLECTION)
      .find({})
      .toArray();
    expect(recorded).toHaveLength(0);
  });
});
