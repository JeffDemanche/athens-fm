import { QueueItemType } from "../entities/QueueItem.js";
import { AppError } from "../middleware/errorHandler.js";

export type MediaMetadata = {
  title: string;
  thumbnailUrl: string;
};

/** Provider-agnostic metadata lookup (title, thumbnails, later richer fields). */
export interface MediaMetadataProvider {
  fetch(type: QueueItemType, externalId: string): Promise<MediaMetadata>;
}

type YouTubeVideosListResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
  error?: {
    message?: string;
  };
};

function youtubeThumbnailFallback(externalId: string): string {
  return `https://i.ytimg.com/vi/${externalId}/hqdefault.jpg`;
}

export function createYouTubeDataApiMetadataProvider(options?: {
  apiKey?: string;
  fetchFn?: typeof fetch;
}): MediaMetadataProvider {
  return {
    async fetch(type: QueueItemType, externalId: string): Promise<MediaMetadata> {
      if (type !== QueueItemType.YOUTUBE) {
        throw new AppError(`Unsupported media type for metadata: ${type}`, 400);
      }

      const apiKey = options?.apiKey ?? process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        throw new AppError(
          "YouTube metadata requires YOUTUBE_API_KEY to be set",
          500,
        );
      }

      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("id", externalId);
      url.searchParams.set("key", apiKey);

      const fetchFn = options?.fetchFn ?? globalThis.fetch;

      let response: Response;
      try {
        response = await fetchFn(url);
      } catch {
        throw new AppError("Unable to reach YouTube Data API", 502);
      }

      let body: YouTubeVideosListResponse;
      try {
        body = (await response.json()) as YouTubeVideosListResponse;
      } catch {
        throw new AppError("Invalid response from YouTube Data API", 502);
      }

      if (!response.ok) {
        throw new AppError(
          body.error?.message ?? "YouTube Data API request failed",
          502,
        );
      }

      const item = body.items?.[0];
      const title = item?.snippet?.title?.trim();
      if (!item || !title) {
        throw new AppError("YouTube video not found", 404);
      }

      const thumbnailUrl =
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url ??
        youtubeThumbnailFallback(externalId);

      return { title, thumbnailUrl };
    },
  };
}

export function createMediaMetadataProvider(
  options?: Parameters<typeof createYouTubeDataApiMetadataProvider>[0],
): MediaMetadataProvider {
  const youtube = createYouTubeDataApiMetadataProvider(options);

  return {
    async fetch(type: QueueItemType, externalId: string) {
      switch (type) {
        case QueueItemType.YOUTUBE:
          return youtube.fetch(type, externalId);
        default: {
          const _exhaustive: never = type;
          throw new AppError(
            `Unsupported media type for metadata: ${_exhaustive}`,
            400,
          );
        }
      }
    },
  };
}

export const mediaMetadataProvider = createMediaMetadataProvider();
