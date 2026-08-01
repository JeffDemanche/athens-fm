export type MediaProvider = "YOUTUBE";

export type EmbeddableMedia = {
  type: MediaProvider;
  externalId: string;
};

export type MediaPlayerStatus = "idle" | "loading" | "ready" | "error";

export type MediaPlayerEvents = {
  onReady?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
};

/**
 * Provider-agnostic player surface. Today only YouTube implements this;
 * add other adapters (e.g. SoundCloud) behind the same contract.
 */
export interface MediaPlayer {
  readonly provider: MediaProvider;
  mount(
    container: HTMLElement,
    media: EmbeddableMedia,
    events?: MediaPlayerEvents,
  ): Promise<void>;
  /** Set playback volume in the range 0–100. */
  setVolume(level: number): void;
  /** Current playback volume in the range 0–100, or null if not ready. */
  getVolume(): number | null;
  destroy(): void;
}
