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
              participant { id name role }
            }
          }
        `,
        variables: { name },
      });

    expect(response.body.errors).toBeUndefined();
    return response.body.data.createRoom as {
      room: { id: string; shortId: string };
      participant: { id: string; name: string | null; role: string };
    };
  }

  it("creates an unnamed host and joins guests by name", async () => {
    const created = await createRoom("Vote Night");
    expect(created.participant).toMatchObject({
      role: "HOST",
      name: null,
    });

    const joinResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation JoinRoom($roomId: ID!, $name: String!) {
            joinRoom(roomId: $roomId, name: $name) {
              id
              name
              role
              roomId
              room { shortId }
            }
          }
        `,
        variables: { roomId: created.room.shortId, name: "Maya" },
      });

    expect(joinResponse.body.errors).toBeUndefined();
    expect(joinResponse.body.data.joinRoom).toMatchObject({
      role: "GUEST",
      name: "Maya",
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
              participants { id role name }
            }
          }
        `,
        variables: { id: created.room.id },
      });

    expect(participantsResponse.body.data.room.participants).toEqual([
      expect.objectContaining({
        id: created.participant.id,
        role: "HOST",
        name: null,
      }),
    ]);
  });

  it("rejects duplicate display names in a room", async () => {
    const created = await createRoom("Name Clash");

    await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation JoinRoom($roomId: ID!, $name: String!) {
            joinRoom(roomId: $roomId, name: $name) { id }
          }
        `,
        variables: { roomId: created.room.shortId, name: "Maya" },
      });

    const joinResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation JoinRoom($roomId: ID!, $name: String!) {
            joinRoom(roomId: $roomId, name: $name) { id }
          }
        `,
        variables: { roomId: created.room.shortId, name: "maya" },
      });

    expect(joinResponse.body.data?.joinRoom ?? null).toBeNull();
    expect(joinResponse.body.errors?.[0]?.message).toMatch(/already taken/i);
  });

  it("rejects joining a missing room", async () => {
    const joinResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation JoinRoom($roomId: ID!, $name: String!) {
            joinRoom(roomId: $roomId, name: $name) { id }
          }
        `,
        variables: { roomId: "ZZZZZ", name: "Maya" },
      });

    expect(joinResponse.body.data?.joinRoom ?? null).toBeNull();
    expect(joinResponse.body.errors?.[0]?.message).toMatch(/room not found/i);
  });
});
