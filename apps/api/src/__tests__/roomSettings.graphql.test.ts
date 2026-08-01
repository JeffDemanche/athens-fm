import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../config/mongo.js";
import { initPubSub } from "../graphql/pubsub.js";
import {
  DEFAULT_SKIP_QUORUM_PERCENT,
  DEFAULT_VOLUME_QUORUM_PERCENT,
  quorumThreshold,
} from "../lib/roomSettings.js";

describe("quorumThreshold", () => {
  it("matches historical skip majority at 51%", () => {
    expect(quorumThreshold(0, 51)).toBe(0);
    expect(quorumThreshold(1, 51)).toBe(1);
    expect(quorumThreshold(2, 51)).toBe(2);
    expect(quorumThreshold(3, 51)).toBe(2);
    expect(quorumThreshold(4, 51)).toBe(3);
  });

  it("matches historical volume quorum at 34%", () => {
    expect(quorumThreshold(0, 34)).toBe(0);
    expect(quorumThreshold(1, 34)).toBe(1);
    expect(quorumThreshold(2, 34)).toBe(1);
    expect(quorumThreshold(3, 34)).toBe(2);
    expect(quorumThreshold(4, 34)).toBe(2);
    expect(quorumThreshold(6, 34)).toBe(3);
  });
});

describe("GraphQL Room settings API", () => {
  let mongo: MongoMemoryServer;
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    initPubSub();
    mongo = await MongoMemoryServer.create();
    await connectMongo(mongo.getUri());
    app = await createApp();
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

  async function createRoom(name: string) {
    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation CreateRoom($name: String!) {
            createRoom(name: $name) {
              room {
                id
                shortId
                skipQuorumPercent
                volumeQuorumPercent
                maxSubmissionDurationMinutes
                maxSimultaneousSubmissions
              }
              participant { id role }
            }
          }
        `,
        variables: { name },
      });

    expect(response.body.errors).toBeUndefined();
    return response.body.data.createRoom as {
      room: {
        id: string;
        shortId: string;
        skipQuorumPercent: number;
        volumeQuorumPercent: number;
        maxSubmissionDurationMinutes: number | null;
        maxSimultaneousSubmissions: number | null;
      };
      participant: { id: string; role: string };
    };
  }

  async function joinGuest(roomId: string, name: string) {
    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation JoinRoom($roomId: ID!, $name: String!) {
            joinRoom(roomId: $roomId, name: $name) { id }
          }
        `,
        variables: { roomId, name },
      });
    expect(response.body.errors).toBeUndefined();
    return response.body.data.joinRoom.id as string;
  }

  it("creates rooms with default settings", async () => {
    const created = await createRoom("Settings Desk");
    expect(created.room).toMatchObject({
      skipQuorumPercent: DEFAULT_SKIP_QUORUM_PERCENT,
      volumeQuorumPercent: DEFAULT_VOLUME_QUORUM_PERCENT,
      maxSubmissionDurationMinutes: null,
      maxSimultaneousSubmissions: null,
    });
  });

  it("lets the host update settings and rejects guests", async () => {
    const created = await createRoom("Tunable Room");
    const guestId = await joinGuest(created.room.shortId, "Alex");

    const updated = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Update($participantId: ID!, $input: RoomSettingsInput!) {
            updateRoomSettings(participantId: $participantId, input: $input) {
              id
              skipQuorumPercent
              volumeQuorumPercent
              maxSubmissionDurationMinutes
              maxSimultaneousSubmissions
            }
          }
        `,
        variables: {
          participantId: created.participant.id,
          input: {
            skipQuorumPercent: 60,
            volumeQuorumPercent: 25,
            maxSubmissionDurationMinutes: 10,
            maxSimultaneousSubmissions: 2,
          },
        },
      });

    expect(updated.body.errors).toBeUndefined();
    expect(updated.body.data.updateRoomSettings).toMatchObject({
      id: created.room.id,
      skipQuorumPercent: 60,
      volumeQuorumPercent: 25,
      maxSubmissionDurationMinutes: 10,
      maxSimultaneousSubmissions: 2,
    });

    const denied = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Update($participantId: ID!, $input: RoomSettingsInput!) {
            updateRoomSettings(participantId: $participantId, input: $input) {
              id
            }
          }
        `,
        variables: {
          participantId: guestId,
          input: {
            skipQuorumPercent: 50,
            volumeQuorumPercent: 50,
            maxSubmissionDurationMinutes: null,
            maxSimultaneousSubmissions: null,
          },
        },
      });

    expect(denied.body.errors?.[0]?.message).toMatch(/host/i);
  });

  it("rejects invalid quorum percents", async () => {
    const created = await createRoom("Bad Percents");

    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Update($participantId: ID!, $input: RoomSettingsInput!) {
            updateRoomSettings(participantId: $participantId, input: $input) {
              id
            }
          }
        `,
        variables: {
          participantId: created.participant.id,
          input: {
            skipQuorumPercent: 0,
            volumeQuorumPercent: 50,
            maxSubmissionDurationMinutes: null,
            maxSimultaneousSubmissions: null,
          },
        },
      });

    expect(response.body.errors?.[0]?.message).toMatch(/1 and 100/i);
  });
});
