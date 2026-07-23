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
  destroy(): void;
}
