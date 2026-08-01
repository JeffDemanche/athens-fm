import { jest } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { connectMongo, disconnectMongo } from "../config/mongo.js";
import { initPubSub } from "../graphql/pubsub.js";
import { volumeThreshold } from "../services/volumeVoteService.js";

const youtubeTitles: Record<string, string> = {
  dQw4w9WgXcQ: "Never Gonna Give You Up",
  jNQXAC9IVRw: "Me at the zoo",
};

describe("volumeThreshold", () => {
  it("returns floor(n/3)+1 (lower than skip majority)", () => {
    expect(volumeThreshold(0)).toBe(0);
    expect(volumeThreshold(1)).toBe(1);
    expect(volumeThreshold(2)).toBe(1);
    expect(volumeThreshold(3)).toBe(2);
    expect(volumeThreshold(4)).toBe(2);
    expect(volumeThreshold(6)).toBe(3);
  });
});

describe("GraphQL VolumeVote API", () => {
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

  type VolumeState = {
    roomId: string;
    queueItemId: string | null;
    upCount: number;
    downCount: number;
    netCount: number;
    participantCount: number;
    threshold: number;
    passed: boolean;
    direction: "UP" | "DOWN" | null;
    viewerVote: "UP" | "DOWN" | "NONE";
  };

  async function volumeState(roomId: string, participantId?: string) {
    const response = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          query State($roomId: ID!, $participantId: ID) {
            volumeVoteState(roomId: $roomId, participantId: $participantId) {
              roomId
              queueItemId
              upCount
              downCount
              netCount
              participantCount
              threshold
              passed
              direction
              viewerVote
            }
          }
        `,
        variables: { roomId, participantId: participantId ?? null },
      });
    expect(response.body.errors).toBeUndefined();
    return response.body.data.volumeVoteState as VolumeState;
  }

  async function setVolume(
    participantId: string,
    value: "UP" | "DOWN" | "NONE",
  ) {
    return request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Set($participantId: ID!, $value: VolumeVoteValue!) {
            setVolumeVote(participantId: $participantId, value: $value) {
              upCount
              downCount
              netCount
              participantCount
              threshold
              passed
              direction
              viewerVote
              queueItemId
            }
          }
        `,
        variables: { participantId, value },
      });
  }

  it("rejects volume votes when nothing is playing", async () => {
    const created = await createRoom("Volume Desk");
    const guestId = await joinGuest(created.room.shortId, "Maya");

    const response = await setVolume(guestId, "UP");
    expect(response.body.errors?.[0]?.message).toMatch(/nothing is playing/i);
  });

  it("sets, switches, and clears volume votes; passes on net quorum", async () => {
    const created = await createRoom("Volume Desk");
    const guestA = await joinGuest(created.room.shortId, "Maya");
    const guestB = await joinGuest(created.room.shortId, "Leo");
    const guestC = await joinGuest(created.room.shortId, "Sam");
    const guestD = await joinGuest(created.room.shortId, "Kit");

    const itemId = await addItem(guestA, "dQw4w9WgXcQ");
    await popItem(itemId);

    const idle = await volumeState(created.room.id, guestA);
    expect(idle.queueItemId).toBe(itemId);
    expect(idle).toMatchObject({
      upCount: 0,
      downCount: 0,
      netCount: 0,
      participantCount: 4,
      threshold: 2,
      passed: false,
      direction: null,
      viewerVote: "NONE",
    });

    const up = await setVolume(guestA, "UP");
    expect(up.body.errors).toBeUndefined();
    expect(up.body.data.setVolumeVote).toMatchObject({
      upCount: 1,
      downCount: 0,
      netCount: 1,
      threshold: 2,
      passed: false,
      viewerVote: "UP",
      queueItemId: itemId,
    });

    const switched = await setVolume(guestA, "DOWN");
    expect(switched.body.errors).toBeUndefined();
    expect(switched.body.data.setVolumeVote).toMatchObject({
      upCount: 0,
      downCount: 1,
      netCount: -1,
      viewerVote: "DOWN",
      passed: false,
    });

    const cleared = await setVolume(guestA, "NONE");
    expect(cleared.body.errors).toBeUndefined();
    expect(cleared.body.data.setVolumeVote).toMatchObject({
      upCount: 0,
      downCount: 0,
      netCount: 0,
      viewerVote: "NONE",
    });

    await setVolume(guestA, "UP");
    const second = await setVolume(guestB, "UP");
    expect(second.body.errors).toBeUndefined();
    expect(second.body.data.setVolumeVote).toMatchObject({
      upCount: 2,
      downCount: 0,
      netCount: 2,
      threshold: 2,
      passed: true,
      direction: "UP",
      viewerVote: "UP",
    });

    void guestC;
    void guestD;
  });

  it("net counts cancel opposing votes before quorum", async () => {
    const created = await createRoom("Volume Desk");
    const guestA = await joinGuest(created.room.shortId, "Maya");
    const guestB = await joinGuest(created.room.shortId, "Leo");
    const guestC = await joinGuest(created.room.shortId, "Sam");

    const itemId = await addItem(guestA, "dQw4w9WgXcQ");
    await popItem(itemId);

    await setVolume(guestA, "UP");
    await setVolume(guestB, "UP");
    const opposed = await setVolume(guestC, "DOWN");
    expect(opposed.body.errors).toBeUndefined();
    // net = 2 - 1 = 1; threshold for 3 guests is 2 → not passed
    expect(opposed.body.data.setVolumeVote).toMatchObject({
      upCount: 2,
      downCount: 1,
      netCount: 1,
      threshold: 2,
      passed: false,
      direction: null,
    });
  });

  it("resets volume votes when the next item is popped", async () => {
    const created = await createRoom("Volume Desk");
    const guestA = await joinGuest(created.room.shortId, "Maya");

    const firstId = await addItem(guestA, "dQw4w9WgXcQ");
    const secondId = await addItem(guestA, "jNQXAC9IVRw");
    await popItem(firstId);

    await setVolume(guestA, "UP");
    let state = await volumeState(created.room.id, guestA);
    expect(state.upCount).toBe(1);
    expect(state.viewerVote).toBe("UP");

    await popItem(secondId);
    state = await volumeState(created.room.id, guestA);
    expect(state.queueItemId).toBe(secondId);
    expect(state.upCount).toBe(0);
    expect(state.netCount).toBe(0);
    expect(state.viewerVote).toBe("NONE");
    expect(state.passed).toBe(false);
  });

  it("acknowledgeVolumeNudge clears votes after quorum", async () => {
    const created = await createRoom("Volume Desk");
    const guestA = await joinGuest(created.room.shortId, "Maya");
    const guestB = await joinGuest(created.room.shortId, "Leo");

    const itemId = await addItem(guestA, "dQw4w9WgXcQ");
    await popItem(itemId);

    await setVolume(guestA, "DOWN");
    // 2 guests → threshold 1; one DOWN vote passes
    const passed = await setVolume(guestB, "NONE");
    expect(passed.body.data.setVolumeVote).toMatchObject({
      downCount: 1,
      netCount: -1,
      threshold: 1,
      passed: true,
      direction: "DOWN",
    });

    const ack = await request(app)
      .post("/api/graphql")
      .send({
        query: `
          mutation Ack($roomId: ID!) {
            acknowledgeVolumeNudge(roomId: $roomId) {
              upCount
              downCount
              netCount
              passed
              direction
              viewerVote
              queueItemId
            }
          }
        `,
        variables: { roomId: created.room.id },
      });

    expect(ack.body.errors).toBeUndefined();
    expect(ack.body.data.acknowledgeVolumeNudge).toMatchObject({
      upCount: 0,
      downCount: 0,
      netCount: 0,
      passed: false,
      direction: null,
      queueItemId: itemId,
    });

    const state = await volumeState(created.room.id, guestA);
    expect(state.viewerVote).toBe("NONE");
  });

  it("excludes inactive guests from volume quorum and vote count", async () => {
    const created = await createRoom("Volume Desk");
    const guestA = await joinGuest(created.room.shortId, "Maya");
    const guestB = await joinGuest(created.room.shortId, "Leo");

    const itemId = await addItem(guestA, "dQw4w9WgXcQ");
    await popItem(itemId);
    await setVolume(guestA, "UP");
    await setVolume(guestB, "UP");

    let state = await volumeState(created.room.id, guestA);
    expect(state.participantCount).toBe(2);
    expect(state.upCount).toBe(2);
    expect(state.passed).toBe(true);
    expect(state.direction).toBe("UP");

    await mongoose.connection.collection("participants").updateOne(
      { _id: new mongoose.Types.ObjectId(guestB) },
      {
        $set: {
          lastActiveAt: new Date(Date.now() - 21 * 60 * 1000),
        },
      },
    );

    state = await volumeState(created.room.id, guestA);
    expect(state.participantCount).toBe(1);
    expect(state.threshold).toBe(1);
    expect(state.upCount).toBe(1);
    expect(state.passed).toBe(true);
  });
});
