import { useEffect, useRef } from "react";
import { createMediaPlayer } from "./create-media-player";
import type { EmbeddableMedia, MediaPlayer, MediaPlayerEvents } from "./types";

type UseMediaPlayerOptions = {
  events?: MediaPlayerEvents;
  /** Playback volume 0–100; applied on ready and whenever it changes. */
  volume?: number;
};

/**
 * Mounts a provider-specific MediaPlayer into a container div and tears it down
 * when the media identity changes or the component unmounts.
 */
export function useMediaPlayer(
  media: EmbeddableMedia | null,
  options?: UseMediaPlayerOptions,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MediaPlayer | null>(null);
  const eventsRef = useRef(options?.events);
  eventsRef.current = options?.events;
  const volumeRef = useRef(options?.volume);
  volumeRef.current = options?.volume;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !media) {
      playerRef.current?.destroy();
      playerRef.current = null;
      if (container) {
        container.replaceChildren();
      }
      return;
    }

    const player = createMediaPlayer(media.type);
    playerRef.current = player;
    let cancelled = false;

    void player
      .mount(container, media, {
        onReady: () => {
          if (volumeRef.current != null) {
            player.setVolume(volumeRef.current);
          }
          eventsRef.current?.onReady?.();
        },
        onEnded: () => eventsRef.current?.onEnded?.(),
        onError: (error) => eventsRef.current?.onError?.(error),
      })
      .catch(() => {
        if (!cancelled) {
          container.replaceChildren();
        }
      });

    return () => {
      cancelled = true;
      player.destroy();
      if (playerRef.current === player) {
        playerRef.current = null;
      }
    };
  }, [media?.type, media?.externalId]);

  useEffect(() => {
    if (options?.volume == null) {
      return;
    }
    playerRef.current?.setVolume(options.volume);
  }, [options?.volume]);

  return containerRef;
}
