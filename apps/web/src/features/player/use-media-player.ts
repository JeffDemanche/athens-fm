import { useEffect, useRef } from "react";
import { createMediaPlayer } from "./create-media-player";
import type { EmbeddableMedia, MediaPlayer } from "./types";

/**
 * Mounts a provider-specific MediaPlayer into a container div and tears it down
 * when the media identity changes or the component unmounts.
 */
export function useMediaPlayer(media: EmbeddableMedia | null) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MediaPlayer | null>(null);

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

    void player.mount(container, media).catch(() => {
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

  return containerRef;
}
