import { QueueItemType } from "../entities/QueueItem.js";
import { AppError } from "../middleware/errorHandler.js";

/** YouTube video ids are 11 characters from [A-Za-z0-9_-]. */
const YOUTUBE_VIDEO_ID = /^[\w-]{11}$/;

/**
 * Parse a YouTube watch/share/embed URL or bare video id into a canonical id.
 */
export function parseYouTubeMediaRef(mediaRef: string): string {
  const trimmed = mediaRef.trim();
  if (!trimmed) {
    throw new AppError("YouTube URL or video id is required", 400);
  }

  if (YOUTUBE_VIDEO_ID.test(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new AppError("Invalid YouTube URL or video id", 400);
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (YOUTUBE_VIDEO_ID.test(id)) {
      return id;
    }
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const fromQuery = url.searchParams.get("v");
    if (fromQuery && YOUTUBE_VIDEO_ID.test(fromQuery)) {
      return fromQuery;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const embedIndex = parts.findIndex(
      (part) => part === "embed" || part === "shorts" || part === "live" || part === "v",
    );
    if (embedIndex >= 0) {
      const id = parts[embedIndex + 1] ?? "";
      if (YOUTUBE_VIDEO_ID.test(id)) {
        return id;
      }
    }
  }

  throw new AppError("Could not parse a YouTube video id from that URL", 400);
}

export function resolveExternalId(
  type: QueueItemType,
  mediaRef: string,
): string {
  switch (type) {
    case QueueItemType.YOUTUBE:
      return parseYouTubeMediaRef(mediaRef);
    default: {
      const _exhaustive: never = type;
      throw new AppError(`Unsupported queue item type: ${_exhaustive}`, 400);
    }
  }
}

/** Build a privacy-enhanced embed URL for the given provider + external id. */
export function buildEmbedUrl(type: QueueItemType, externalId: string): string {
  switch (type) {
    case QueueItemType.YOUTUBE:
      return `https://www.youtube-nocookie.com/embed/${externalId}`;
    default: {
      const _exhaustive: never = type;
      throw new AppError(`Unsupported queue item type: ${_exhaustive}`, 400);
    }
  }
}
