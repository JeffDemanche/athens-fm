import { jest } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../config/mongo.js";
import { initPubSub } from "../graphql/pubsub.js";
import { skipThreshold } from "../services/skipVoteService.js";

const youtubeTitles: Record<string, string> = {
  dQw4w9WgXcQ: "Never Gonna Give You Up",
  jNQXAC9IVRw: "Me at the zoo",
};

describe("skipThreshold", () => {
  it("returns a simple majority", () => {
    expect(skipThreshold(0)).toBe(0);
    expect(skipThreshold(1)).toBe(1);
    expect(skipThreshold(2)).toBe(2);
    expect(skipThreshold(3)).toBe(2);
    expect(skipThreshold(4)).toBe(3);
  });
});

describe("GraphQL SkipVote API", () => {
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
    return response.body.data.addQueueItem.id as string;
  }

  async function popItem(id: string) {
    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Pop($id: ID!) {
            popQueueItem(id: $id) { id finished }
          }
        `,
        variables: { id },
      });
    expect(response.body.errors).toBeUndefined();
    return response.body.data.popQueueItem as { id: string; finished: boolean };
  }

  async function skipState(roomId: string, participantId?: string) {
    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          query State($roomId: ID!, $participantId: ID) {
            skipVoteState(roomId: $roomId, participantId: $participantId) {
              roomId
              queueItemId
              voteCount
              participantCount
              threshold
              passed
              viewerHasVoted
            }
          }
        `,
        variables: { roomId, participantId: participantId ?? null },
      });
    expect(response.body.errors).toBeUndefined();
    return response.body.data.skipVoteState as {
      roomId: string;
      queueItemId: string | null;
      voteCount: number;
      participantCount: number;
      threshold: number;
      passed: boolean;
      viewerHasVoted: boolean;
    };
  }

  async function toggleSkip(participantId: string) {
    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Toggle($participantId: ID!) {
            toggleSkipVote(participantId: $participantId) {
              voteCount
              participantCount
              threshold
              passed
              viewerHasVoted
              queueItemId
            }
          }
        `,
        variables: { participantId },
      });
    return response;
  }

  it("rejects skip votes when nothing is playing", async () => {
    const created = await createRoom("Skip Desk");
    const guestId = await joinGuest(created.room.shortId, "Maya");

    const response = await toggleSkip(guestId);
    expect(response.body.errors?.[0]?.message).toMatch(/nothing is playing/i);
  });

  it("toggles skip votes and passes on simple majority of guests", async () => {
    const created = await createRoom("Skip Desk");
    const guestA = await joinGuest(created.room.shortId, "Maya");
    const guestB = await joinGuest(created.room.shortId, "Leo");
    const guestC = await joinGuest(created.room.shortId, "Sam");

    const itemId = await addItem(guestA, "dQw4w9WgXcQ");
    await popItem(itemId);

    const idle = await skipState(created.room.id, guestA);
    expect(idle.queueItemId).toBe(itemId);
    expect(idle.voteCount).toBe(0);
    expect(idle.participantCount).toBe(3);
    expect(idle.threshold).toBe(2);
    expect(idle.passed).toBe(false);
    expect(idle.viewerHasVoted).toBe(false);

    const first = await toggleSkip(guestA);
    expect(first.body.errors).toBeUndefined();
    expect(first.body.data.toggleSkipVote).toMatchObject({
      voteCount: 1,
      threshold: 2,
      passed: false,
      viewerHasVoted: true,
      queueItemId: itemId,
    });

    const cleared = await toggleSkip(guestA);
    expect(cleared.body.errors).toBeUndefined();
    expect(cleared.body.data.toggleSkipVote).toMatchObject({
      voteCount: 0,
      viewerHasVoted: false,
      passed: false,
    });

    await toggleSkip(guestA);
    const second = await toggleSkip(guestB);
    expect(second.body.errors).toBeUndefined();
    expect(second.body.data.toggleSkipVote).toMatchObject({
      voteCount: 2,
      threshold: 2,
      passed: true,
      viewerHasVoted: true,
    });

    // Third guest not required once majority is met.
    void guestC;
  });

  it("resets skip votes when the next item is popped", async () => {
    const created = await createRoom("Skip Desk");
    const guestA = await joinGuest(created.room.shortId, "Maya");
    const guestB = await joinGuest(created.room.shortId, "Leo");

    const firstId = await addItem(guestA, "dQw4w9WgXcQ");
    const secondId = await addItem(guestA, "jNQXAC9IVRw");
    await popItem(firstId);

    await toggleSkip(guestA);
    let state = await skipState(created.room.id, guestA);
    expect(state.voteCount).toBe(1);
    expect(state.viewerHasVoted).toBe(true);

    await popItem(secondId);
    state = await skipState(created.room.id, guestA);
    expect(state.queueItemId).toBe(secondId);
    expect(state.voteCount).toBe(0);
    expect(state.viewerHasVoted).toBe(false);
    expect(state.passed).toBe(false);

    // Host is excluded from quorum — two guests → threshold 2.
    expect(state.participantCount).toBe(2);
    expect(state.threshold).toBe(2);
    void guestB;
  });

  it("clearNowPlaying clears the tally when the queue is idle", async () => {
    const created = await createRoom("Skip Desk");
    const guestId = await joinGuest(created.room.shortId, "Maya");
    const itemId = await addItem(guestId, "dQw4w9WgXcQ");
    await popItem(itemId);
    await toggleSkip(guestId);

    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Clear($roomId: ID!) {
            clearNowPlaying(roomId: $roomId) {
              queueItemId
              voteCount
              viewerHasVoted
              passed
            }
          }
        `,
        variables: { roomId: created.room.id },
      });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.clearNowPlaying).toEqual({
      queueItemId: null,
      voteCount: 0,
      viewerHasVoted: false,
      passed: false,
    });
  });

  it("excludes inactive guests from skip quorum and vote count", async () => {
    const created = await createRoom("Skip Desk");
    const guestA = await joinGuest(created.room.shortId, "Maya");
    const guestB = await joinGuest(created.room.shortId, "Leo");

    const itemId = await addItem(guestA, "dQw4w9WgXcQ");
    await popItem(itemId);
    await toggleSkip(guestA);
    await toggleSkip(guestB);

    let state = await skipState(created.room.id, guestA);
    expect(state.participantCount).toBe(2);
    expect(state.voteCount).toBe(2);
    expect(state.passed).toBe(true);

    // Age guest B past the active TTL.
    await mongoose.connection.collection("participants").updateOne(
      { _id: new mongoose.Types.ObjectId(guestB) },
      {
        $set: {
          lastActiveAt: new Date(Date.now() - 21 * 60 * 1000),
        },
      },
    );

    state = await skipState(created.room.id, guestA);
    expect(state.participantCount).toBe(1);
    expect(state.threshold).toBe(1);
    expect(state.voteCount).toBe(1);
    expect(state.passed).toBe(true);

    const touch = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Touch($participantId: ID!) {
            touchParticipantActivity(participantId: $participantId) {
              id
              lastActiveAt
            }
          }
        `,
        variables: { participantId: guestB },
      });
    expect(touch.body.errors).toBeUndefined();

    state = await skipState(created.room.id, guestA);
    expect(state.participantCount).toBe(2);
    expect(state.voteCount).toBe(2);
  });
});
