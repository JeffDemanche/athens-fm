import { loadYouTubeIframeApi } from "./load-youtube-api";
import type {
  EmbeddableMedia,
  MediaPlayer,
  MediaPlayerEvents,
} from "./types";

type YouTubePlayerInstance = {
  destroy: () => void;
  setVolume?: (volume: number) => void;
  getVolume?: () => number;
};

/** YT.PlayerState.ENDED — hardcode fallback if namespace omits constants. */
const YT_ENDED = 0;

function clampVolume(level: number): number {
  if (!Number.isFinite(level)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(level)));
}

export class YouTubeMediaPlayer implements MediaPlayer {
  readonly provider = "YOUTUBE" as const;
  private player: YouTubePlayerInstance | null = null;
  private host: HTMLDivElement | null = null;
  private endedFired = false;
  private pendingVolume: number | null = null;

  async mount(
    container: HTMLElement,
    media: EmbeddableMedia,
    events?: MediaPlayerEvents,
  ): Promise<void> {
    if (media.type !== "YOUTUBE") {
      throw new Error(`YouTubeMediaPlayer cannot play type ${media.type}`);
    }

    this.destroy();
    this.endedFired = false;

    const host = document.createElement("div");
    host.className = "h-full w-full";
    container.replaceChildren(host);
    this.host = host;

    const YT = await loadYouTubeIframeApi();
    if (this.host !== host) {
      return;
    }

    const endedState = YT.PlayerState?.ENDED ?? YT_ENDED;

    this.player = new YT.Player(host, {
      videoId: media.externalId,
      width: "100%",
      height: "100%",
      playerVars: {
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        autoplay: 1,
      },
      events: {
        onReady: () => {
          if (this.pendingVolume != null) {
            this.setVolume(this.pendingVolume);
          }
          events?.onReady?.();
        },
        onStateChange: (event) => {
          if (event.data !== endedState || this.endedFired) {
            return;
          }
          this.endedFired = true;
          events?.onEnded?.();
        },
        onError: (event) => {
          events?.onError?.(
            new Error(`YouTube player error code ${event.data}`),
          );
        },
      },
    });
  }

  setVolume(level: number): void {
    const clamped = clampVolume(level);
    this.pendingVolume = clamped;
    try {
      this.player?.setVolume?.(clamped);
    } catch {
      // Player may not be ready yet; pendingVolume applies onReady.
    }
  }

  getVolume(): number | null {
    try {
      const value = this.player?.getVolume?.();
      return typeof value === "number" ? clampVolume(value) : this.pendingVolume;
    } catch {
      return this.pendingVolume;
    }
  }

  destroy(): void {
    if (this.player) {
      try {
        this.player.destroy();
      } catch {
        // Player may already be torn down with the DOM node.
      }
      this.player = null;
    }
    this.host = null;
    this.pendingVolume = null;
  }
}
