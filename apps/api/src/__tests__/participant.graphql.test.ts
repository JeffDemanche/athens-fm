import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../config/mongo.js";

describe("GraphQL Participant API", () => {
  let mongo: MongoMemoryServer;
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connectMongo(mongo.getUri());
    app = await createApp();
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

  async function createRoom(name: string) {
    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation CreateRoom($name: String!) {
            createRoom(name: $name) {
              room { id shortId }
              participant { id }
            }
          }
        `,
        variables: { name },
      });

    expect(response.body.errors).toBeUndefined();
    return response.body.data.createRoom as {
      room: { id: string; shortId: string };
      participant: { id: string };
    };
  }

  it("joins and leaves a room as a guest", async () => {
    const created = await createRoom("Vote Night");

    const joinResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation JoinRoom($roomId: ID!) {
            joinRoom(roomId: $roomId) {
              id
              role
              roomId
              room { shortId }
            }
          }
        `,
        variables: { roomId: created.room.shortId },
      });

    expect(joinResponse.body.errors).toBeUndefined();
    expect(joinResponse.body.data.joinRoom).toMatchObject({
      role: "GUEST",
      roomId: created.room.id,
      room: { shortId: created.room.shortId },
    });

    const guestId = joinResponse.body.data.joinRoom.id as string;

    const leaveResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation LeaveRoom($participantId: ID!) {
            leaveRoom(participantId: $participantId)
          }
        `,
        variables: { participantId: guestId },
      });

    expect(leaveResponse.body.errors).toBeUndefined();
    expect(leaveResponse.body.data.leaveRoom).toBe(true);

    const participantsResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          query Room($id: ID!) {
            room(id: $id) {
              participants { id role }
            }
          }
        `,
        variables: { id: created.room.id },
      });

    expect(participantsResponse.body.data.room.participants).toEqual([
      expect.objectContaining({ id: created.participant.id, role: "HOST" }),
    ]);
  });

  it("rejects joining a missing room", async () => {
    const joinResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation JoinRoom($roomId: ID!) {
            joinRoom(roomId: $roomId) { id }
          }
        `,
        variables: { roomId: "ZZZZZ" },
      });

    expect(joinResponse.body.data?.joinRoom ?? null).toBeNull();
    expect(joinResponse.body.errors?.[0]?.message).toMatch(/room not found/i);
  });
});
