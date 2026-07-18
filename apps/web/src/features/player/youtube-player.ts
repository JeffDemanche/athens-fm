import { loadYouTubeIframeApi } from "./load-youtube-api";
import type {
  EmbeddableMedia,
  MediaPlayer,
  MediaPlayerEvents,
} from "./types";

type YouTubePlayerInstance = {
  destroy: () => void;
};

export class YouTubeMediaPlayer implements MediaPlayer {
  readonly provider = "YOUTUBE" as const;
  private player: YouTubePlayerInstance | null = null;
  private host: HTMLDivElement | null = null;

  async mount(
    container: HTMLElement,
    media: EmbeddableMedia,
    events?: MediaPlayerEvents,
  ): Promise<void> {
    if (media.type !== "YOUTUBE") {
      throw new Error(`YouTubeMediaPlayer cannot play type ${media.type}`);
    }

    this.destroy();

    const host = document.createElement("div");
    host.className = "h-full w-full";
    container.replaceChildren(host);
    this.host = host;

    const YT = await loadYouTubeIframeApi();
    if (this.host !== host) {
      return;
    }

    this.player = new YT.Player(host, {
      videoId: media.externalId,
      width: "100%",
      height: "100%",
      playerVars: {
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          events?.onReady?.();
        },
        onError: (event) => {
          events?.onError?.(
            new Error(`YouTube player error code ${event.data}`),
          );
        },
      },
    });
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
  }
}
