import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../config/mongo.js";
import { initPubSub } from "../graphql/pubsub.js";

describe("GraphQL RoomEvent API", () => {
  let mongo: MongoMemoryServer;
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    initPubSub();
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
              participant { id role }
            }
          }
        `,
        variables: { name },
      });

    expect(response.body.errors).toBeUndefined();
    return response.body.data.createRoom as {
      room: { id: string; shortId: string };
      participant: { id: string; role: string };
    };
  }

  it("records join/leave events and lists them chronologically", async () => {
    const created = await createRoom("Pulse");

    const joinResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation JoinRoom($roomId: ID!) {
            joinRoom(roomId: $roomId) { id }
          }
        `,
        variables: { roomId: created.room.shortId },
      });
    expect(joinResponse.body.errors).toBeUndefined();
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

    const eventsResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          query RoomEvents($roomId: ID!) {
            roomEvents(roomId: $roomId) {
              type
              participantId
              participantRole
              participant { id }
            }
            room(id: $roomId) {
              events {
                type
                participantRole
              }
            }
          }
        `,
        variables: { roomId: created.room.id },
      });

    expect(eventsResponse.body.errors).toBeUndefined();
    expect(eventsResponse.body.data.roomEvents).toEqual([
      {
        type: "JOINED",
        participantId: created.participant.id,
        participantRole: "HOST",
        participant: { id: created.participant.id },
      },
      {
        type: "JOINED",
        participantId: guestId,
        participantRole: "GUEST",
        participant: null,
      },
      {
        type: "LEFT",
        participantId: guestId,
        participantRole: "GUEST",
        participant: null,
      },
    ]);
    expect(eventsResponse.body.data.room.events).toEqual([
      { type: "JOINED", participantRole: "HOST" },
      { type: "JOINED", participantRole: "GUEST" },
      { type: "LEFT", participantRole: "GUEST" },
    ]);
  });
});
