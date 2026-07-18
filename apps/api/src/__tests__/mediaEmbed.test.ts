import { QueueItemType } from "../entities/QueueItem.js";
import {
  buildEmbedUrl,
  parseYouTubeMediaRef,
  resolveExternalId,
} from "../lib/mediaEmbed.js";

describe("mediaEmbed", () => {
  it("parses bare ids and common youtube url shapes", () => {
    expect(parseYouTubeMediaRef("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(
      parseYouTubeMediaRef("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeMediaRef("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(
      parseYouTubeMediaRef("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
    expect(
      parseYouTubeMediaRef("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("builds youtube embed urls from type + external id", () => {
    expect(buildEmbedUrl(QueueItemType.YOUTUBE, "dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(resolveExternalId(QueueItemType.YOUTUBE, "jNQXAC9IVRw")).toBe(
      "jNQXAC9IVRw",
    );
  });
});
