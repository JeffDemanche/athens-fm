import type { MediaPlayer, MediaProvider } from "./types";
import { YouTubeMediaPlayer } from "./youtube-player";

/** Factory that returns the correct MediaPlayer adapter for a provider type. */
export function createMediaPlayer(type: MediaProvider): MediaPlayer {
  switch (type) {
    case "YOUTUBE":
      return new YouTubeMediaPlayer();
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unsupported media provider: ${_exhaustive}`);
    }
  }
}
