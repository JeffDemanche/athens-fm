import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectMongo, disconnectMongo } from "../config/mongo.js";
import { migration } from "../migrations/20260801_001_backfill_queue_item_finished.js";
import { runPendingMigrations } from "../migrations/runner.js";

describe("20260801_001_backfill_queue_item_finished", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connectMongo(mongo.getUri());
  }, 30_000);

  afterAll(async () => {
    await disconnectMongo();
    await mongo.stop();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const collection of Object.values(collections)) {
      await collection.deleteMany({});
    }
  });

  it("marks legacy queue items missing finished as finished, and is idempotent", async () => {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Expected mongoose db");
    }

    const roomId = new mongoose.Types.ObjectId();
    const participantId = new mongoose.Types.ObjectId();

    await db.collection("queue_items").insertMany([
      {
        roomId,
        participantId,
        type: "YOUTUBE",
        externalId: "legacy1",
        title: "Legacy missing finished",
        thumbnailUrl: "https://example.com/a.jpg",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        roomId,
        participantId,
        type: "YOUTUBE",
        externalId: "active1",
        title: "Already unfinished",
        thumbnailUrl: "https://example.com/b.jpg",
        finished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        roomId,
        participantId,
        type: "YOUTUBE",
        externalId: "done1",
        title: "Already finished",
        thumbnailUrl: "https://example.com/c.jpg",
        finished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await runPendingMigrations({ migrations: [migration] });

    const docs = await db
      .collection("queue_items")
      .find({})
      .project({ externalId: 1, finished: 1 })
      .toArray();

    expect(docs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ externalId: "legacy1", finished: true }),
        expect.objectContaining({ externalId: "active1", finished: false }),
        expect.objectContaining({ externalId: "done1", finished: true }),
      ]),
    );

    const missingAfter = await db
      .collection("queue_items")
      .countDocuments({ finished: { $exists: false } });
    expect(missingAfter).toBe(0);

    await runPendingMigrations({ migrations: [migration] });
    const stillMissing = await db
      .collection("queue_items")
      .countDocuments({ finished: { $exists: false } });
    expect(stillMissing).toBe(0);
  });
});
