import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../config/mongo.js";

describe("GraphQL Room API", () => {
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
    const collections = mongoose.connection.collections;
    for (const collection of Object.values(collections)) {
      await collection.deleteMany({});
    }
  });

  it("creates a room with an unnamed host and queries by shortId", async () => {
    const app = await createApp();

    const createResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation CreateRoom($name: String!) {
            createRoom(name: $name) {
              room {
                id
                shortId
                name
              }
              participant {
                id
                roomId
                name
                role
              }
            }
          }
        `,
        variables: { name: "Democratic Disco" },
      });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.errors).toBeUndefined();

    const payload = createResponse.body.data.createRoom;
    expect(payload.room).toMatchObject({
      name: "Democratic Disco",
    });
    expect(payload.room.shortId).toMatch(
      /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/,
    );
    expect(payload.participant).toMatchObject({
      roomId: payload.room.id,
      role: "HOST",
      name: null,
    });

    const shortId = payload.room.shortId as string;
    const mongoId = payload.room.id as string;

    const byShortId = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          query Room($id: ID!) {
            room(id: $id) {
              id
              shortId
              name
              participants {
                id
                role
                name
              }
            }
          }
        `,
        variables: { id: shortId.toLowerCase() },
      });

    expect(byShortId.status).toBe(200);
    expect(byShortId.body.errors).toBeUndefined();
    expect(byShortId.body.data.room).toMatchObject({
      id: mongoId,
      shortId,
      name: "Democratic Disco",
    });
    expect(byShortId.body.data.room.participants).toHaveLength(1);
    expect(byShortId.body.data.room.participants[0]).toMatchObject({
      role: "HOST",
      name: null,
    });
  });
});
