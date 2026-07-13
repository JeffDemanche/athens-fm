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

  it("creates and queries a room", async () => {
    const app = await createApp();

    const createResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation CreateRoom($name: String!) {
            createRoom(name: $name) {
              id
              name
            }
          }
        `,
        variables: { name: "Democratic Disco" },
      });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.errors).toBeUndefined();
    expect(createResponse.body.data.createRoom).toMatchObject({
      name: "Democratic Disco",
    });

    const roomId = createResponse.body.data.createRoom.id as string;

    const queryResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          query Room($id: ID!) {
            room(id: $id) {
              id
              name
            }
          }
        `,
        variables: { id: roomId },
      });

    expect(queryResponse.status).toBe(200);
    expect(queryResponse.body.errors).toBeUndefined();
    expect(queryResponse.body.data.room).toEqual({
      id: roomId,
      name: "Democratic Disco",
    });
  });
});
