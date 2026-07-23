import { jest } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../config/mongo.js";
import { initPubSub } from "../graphql/pubsub.js";

const youtubeTitles: Record<string, string> = {
  dQw4w9WgXcQ: "Never Gonna Give You Up",
  jNQXAC9IVRw: "Me at the zoo",
};

describe("GraphQL Vote API", () => {
  let mongo: MongoMemoryServer;
  let app: Awaited<ReturnType<typeof createApp>>;
  let fetchSpy: ReturnType<typeof jest.spyOn>;

  beforeAll(async () => {
    process.env.YOUTUBE_API_KEY = "test-youtube-key";
    fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (!url.includes("googleapis.com/youtube/v3/videos")) {
          throw new Error(`Unexpected fetch in test: ${url}`);
        }

        const id = new URL(url).searchParams.get("id") ?? "";
        const title = youtubeTitles[id];
        return {
          ok: true,
          json: async () =>
            title
              ? {
                  items: [
                    {
                      snippet: {
                        title,
                        thumbnails: {
                          high: {
                            url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                          },
                        },
                      },
                    },
                  ],
                }
              : { items: [] },
        } as Response;
      });

    initPubSub();
    mongo = await MongoMemoryServer.create();
    await connectMongo(mongo.getUri());
    app = await createApp();
  }, 30_000);

  afterAll(async () => {
    fetchSpy.mockRestore();
    delete process.env.YOUTUBE_API_KEY;
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
              participant { id role name }
            }
          }
        `,
        variables: { name },
      });

    expect(response.body.errors).toBeUndefined();
    return response.body.data.createRoom as {
      room: { id: string; shortId: string };
      participant: { id: string; role: string; name: string | null };
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

  async function addItem(participantId: string, mediaRef: string) {
    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Add($participantId: ID!, $type: QueueItemType!, $mediaRef: String!) {
            addQueueItem(participantId: $participantId, type: $type, mediaRef: $mediaRef) {
              id
              externalId
              score
            }
          }
        `,
        variables: {
          participantId,
          type: "YOUTUBE",
          mediaRef,
        },
      });
    expect(response.body.errors).toBeUndefined();
    return response.body.data.addQueueItem as {
      id: string;
      externalId: string;
      score: number;
    };
  }

  async function vote(
    participantId: string,
    queueItemId: string,
    value: "UP" | "DOWN",
  ) {
    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Vote($participantId: ID!, $queueItemId: ID!, $value: VoteValue!) {
            voteOnQueueItem(
              participantId: $participantId
              queueItemId: $queueItemId
              value: $value
            ) {
              value
              queueItem { id score }
            }
          }
        `,
        variables: { participantId, queueItemId, value },
      });
    return response;
  }

  it("casts one vote per participant, toggles off, and reorders by score", async () => {
    const created = await createRoom("Ballot");
    const maya = await joinGuest(created.room.shortId, "Maya");
    const sam = await joinGuest(created.room.shortId, "Sam");

    const older = await addItem(maya, "dQw4w9WgXcQ");
    const newer = await addItem(maya, "jNQXAC9IVRw");

    const up = await vote(sam, older.id, "UP");
    expect(up.body.errors).toBeUndefined();
    expect(up.body.data.voteOnQueueItem).toMatchObject({
      value: "UP",
      queueItem: { id: older.id, score: 1 },
    });

    const listAfterUp = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          query Queue($roomId: ID!, $viewer: ID!) {
            queueItems(roomId: $roomId) {
              id
              score
              viewerVote(participantId: $viewer)
            }
            myQueueVotes(roomId: $roomId, participantId: $viewer) {
              queueItemId
              value
            }
          }
        `,
        variables: { roomId: created.room.id, viewer: sam },
      });
    expect(listAfterUp.body.errors).toBeUndefined();
    expect(listAfterUp.body.data.queueItems).toEqual([
      { id: older.id, score: 1, viewerVote: "UP" },
      { id: newer.id, score: 0, viewerVote: null },
    ]);
    expect(listAfterUp.body.data.myQueueVotes).toEqual([
      { queueItemId: older.id, value: "UP" },
    ]);

    const toggleOff = await vote(sam, older.id, "UP");
    expect(toggleOff.body.errors).toBeUndefined();
    expect(toggleOff.body.data.voteOnQueueItem).toMatchObject({
      value: null,
      queueItem: { id: older.id, score: 0 },
    });

    const switchDown = await vote(sam, newer.id, "DOWN");
    expect(switchDown.body.errors).toBeUndefined();
    expect(switchDown.body.data.voteOnQueueItem).toMatchObject({
      value: "DOWN",
      queueItem: { id: newer.id, score: -1 },
    });

    const flipToUp = await vote(sam, newer.id, "UP");
    expect(flipToUp.body.errors).toBeUndefined();
    expect(flipToUp.body.data.voteOnQueueItem).toMatchObject({
      value: "UP",
      queueItem: { id: newer.id, score: 1 },
    });

    const secondUp = await vote(maya, older.id, "UP");
    expect(secondUp.body.errors).toBeUndefined();
    expect(secondUp.body.data.voteOnQueueItem.queueItem.score).toBe(1);

    const ordered = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          query Queue($roomId: ID!) {
            queueItems(roomId: $roomId) { id score }
          }
        `,
        variables: { roomId: created.room.id },
      });
    expect(ordered.body.errors).toBeUndefined();
    // Both score 1: older submission first.
    expect(ordered.body.data.queueItems).toEqual([
      { id: older.id, score: 1 },
      { id: newer.id, score: 1 },
    ]);
  });

  it("rejects votes from participants outside the room", async () => {
    const roomA = await createRoom("Alpha");
    const roomB = await createRoom("Beta");
    const guestA = await joinGuest(roomA.room.shortId, "Ada");
    const guestB = await joinGuest(roomB.room.shortId, "Bea");
    const item = await addItem(guestA, "dQw4w9WgXcQ");

    const response = await vote(guestB, item.id, "UP");
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].message).toMatch(/not in this room/i);
  });

  it("rejects votes on finished queue items", async () => {
    const created = await createRoom("Encore");
    const guestId = await joinGuest(created.room.shortId, "Lee");
    const item = await addItem(guestId, "dQw4w9WgXcQ");

    const pop = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Pop($id: ID!) {
            popQueueItem(id: $id) { id finished }
          }
        `,
        variables: { id: item.id },
      });
    expect(pop.body.errors).toBeUndefined();

    const response = await vote(guestId, item.id, "UP");
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].message).toMatch(/finished/i);
  });
});
