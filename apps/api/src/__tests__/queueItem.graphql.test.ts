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

describe("GraphQL QueueItem API", () => {
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

  it("adds queue items and lists them in submission order with embed urls", async () => {
    const created = await createRoom("Desk");
    const guestId = await joinGuest(created.room.shortId, "Maya");

    const first = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Add($participantId: ID!, $type: QueueItemType!, $mediaRef: String!) {
            addQueueItem(participantId: $participantId, type: $type, mediaRef: $mediaRef) {
              id
              type
              externalId
              title
              thumbnailUrl
              embedUrl
              participantId
              roomId
            }
          }
        `,
        variables: {
          participantId: guestId,
          type: "YOUTUBE",
          mediaRef: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
      });
    expect(first.body.errors).toBeUndefined();
    expect(first.body.data.addQueueItem).toMatchObject({
      type: "YOUTUBE",
      externalId: "dQw4w9WgXcQ",
      title: "Never Gonna Give You Up",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      participantId: guestId,
      roomId: created.room.id,
    });

    const second = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Add($participantId: ID!, $type: QueueItemType!, $mediaRef: String!) {
            addQueueItem(participantId: $participantId, type: $type, mediaRef: $mediaRef) {
              externalId
              title
            }
          }
        `,
        variables: {
          participantId: guestId,
          type: "YOUTUBE",
          mediaRef: "jNQXAC9IVRw",
        },
      });
    expect(second.body.errors).toBeUndefined();
    expect(second.body.data.addQueueItem.title).toBe("Me at the zoo");

    const listResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          query Queue($roomId: ID!) {
            queueItems(roomId: $roomId) {
              externalId
              title
              thumbnailUrl
              participant { id }
            }
            room(id: $roomId) {
              queueItems { externalId title }
            }
          }
        `,
        variables: { roomId: created.room.id },
      });

    expect(listResponse.body.errors).toBeUndefined();
    expect(listResponse.body.data.queueItems).toEqual([
      {
        externalId: "dQw4w9WgXcQ",
        title: "Never Gonna Give You Up",
        thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        participant: { id: guestId },
      },
      {
        externalId: "jNQXAC9IVRw",
        title: "Me at the zoo",
        thumbnailUrl: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
        participant: { id: guestId },
      },
    ]);
    expect(listResponse.body.data.room.queueItems).toEqual([
      { externalId: "dQw4w9WgXcQ", title: "Never Gonna Give You Up" },
      { externalId: "jNQXAC9IVRw", title: "Me at the zoo" },
    ]);
  });

  it("pops a finished item without deleting it and hides it from the playlist", async () => {
    const created = await createRoom("Encore");
    const guestId = await joinGuest(created.room.shortId, "Sam");

    const addResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Add($participantId: ID!, $type: QueueItemType!, $mediaRef: String!) {
            addQueueItem(participantId: $participantId, type: $type, mediaRef: $mediaRef) {
              id
              finished
            }
          }
        `,
        variables: {
          participantId: guestId,
          type: "YOUTUBE",
          mediaRef: "dQw4w9WgXcQ",
        },
      });
    expect(addResponse.body.errors).toBeUndefined();
    const itemId = addResponse.body.data.addQueueItem.id as string;
    expect(addResponse.body.data.addQueueItem.finished).toBe(false);

    const secondAdd = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Add($participantId: ID!, $type: QueueItemType!, $mediaRef: String!) {
            addQueueItem(participantId: $participantId, type: $type, mediaRef: $mediaRef) {
              id
              externalId
            }
          }
        `,
        variables: {
          participantId: guestId,
          type: "YOUTUBE",
          mediaRef: "jNQXAC9IVRw",
        },
      });
    expect(secondAdd.body.errors).toBeUndefined();

    const popResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Pop($id: ID!) {
            popQueueItem(id: $id) {
              id
              finished
              externalId
            }
          }
        `,
        variables: { id: itemId },
      });
    expect(popResponse.body.errors).toBeUndefined();
    expect(popResponse.body.data.popQueueItem).toMatchObject({
      id: itemId,
      finished: true,
      externalId: "dQw4w9WgXcQ",
    });

    const listResponse = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          query Queue($roomId: ID!) {
            queueItems(roomId: $roomId) {
              id
              externalId
              finished
            }
          }
        `,
        variables: { roomId: created.room.id },
      });
    expect(listResponse.body.errors).toBeUndefined();
    expect(listResponse.body.data.queueItems).toEqual([
      {
        id: secondAdd.body.data.addQueueItem.id,
        externalId: "jNQXAC9IVRw",
        finished: false,
      },
    ]);
  });

  it("rejects invalid youtube media refs", async () => {
    const created = await createRoom("Noisy");
    const guestId = await joinGuest(created.room.shortId, "Lee");

    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Add($participantId: ID!, $type: QueueItemType!, $mediaRef: String!) {
            addQueueItem(participantId: $participantId, type: $type, mediaRef: $mediaRef) {
              id
            }
          }
        `,
        variables: {
          participantId: guestId,
          type: "YOUTUBE",
          mediaRef: "https://example.com/not-youtube",
        },
      });

    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].message).toMatch(/YouTube/i);
  });
});
