import { jest } from "@jest/globals";
import { QueueItemType } from "../entities/QueueItem.js";
import { createYouTubeDataApiMetadataProvider } from "../lib/mediaMetadata.js";

describe("YouTube Data API metadata provider", () => {
  it("maps snippet title and high thumbnail", async () => {
    const fetchFn = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [
          {
            snippet: {
              title: "Never Gonna Give You Up",
              thumbnails: {
                high: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" },
              },
            },
          },
        ],
      }),
    }));

    const provider = createYouTubeDataApiMetadataProvider({
      apiKey: "test-key",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await expect(
      provider.fetch(QueueItemType.YOUTUBE, "dQw4w9WgXcQ"),
    ).resolves.toEqual({
      title: "Never Gonna Give You Up",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const calledUrl = String(
      (fetchFn.mock.calls as unknown as Array<[unknown]>)[0]?.[0],
    );
    expect(calledUrl).toContain("googleapis.com/youtube/v3/videos");
    expect(calledUrl).toContain("id=dQw4w9WgXcQ");
    expect(calledUrl).toContain("key=test-key");
  });

  it("rejects when the api key is missing", async () => {
    const previous = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;

    const provider = createYouTubeDataApiMetadataProvider({
      fetchFn: (async () => {
        throw new Error("should not fetch");
      }) as unknown as typeof fetch,
    });

    await expect(
      provider.fetch(QueueItemType.YOUTUBE, "dQw4w9WgXcQ"),
    ).rejects.toThrow(/YOUTUBE_API_KEY/);

    if (previous === undefined) {
      delete process.env.YOUTUBE_API_KEY;
    } else {
      process.env.YOUTUBE_API_KEY = previous;
    }
  });

  it("rejects when the video is missing", async () => {
    const provider = createYouTubeDataApiMetadataProvider({
      apiKey: "test-key",
      fetchFn: (async () => ({
        ok: true,
        json: async () => ({ items: [] }),
      })) as unknown as typeof fetch,
    });

    await expect(
      provider.fetch(QueueItemType.YOUTUBE, "dQw4w9WgXcQ"),
    ).rejects.toThrow(/not found/i);
  });
});
