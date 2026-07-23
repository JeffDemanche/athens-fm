import { DeskPanel } from "@/composites/desk-panel";
import { useMediaPlayer } from "@/features/player/use-media-player";
import type { EmbeddableMedia } from "@/features/player/types";
import { Text } from "@/primitives/text";
import { cn } from "@/lib/utils";

type VideoViewerProps = {
  className?: string;
  media?: EmbeddableMedia | null;
  title?: string | null;
  onEnded?: () => void;
};

export function VideoViewer({
  className,
  media = null,
  title = null,
  onEnded,
}: VideoViewerProps) {
  const containerRef = useMediaPlayer(media, {
    events: { onEnded },
  });

  return (
    <DeskPanel
      title="Now playing"
      description={title ?? "YouTube embed for the current track"}
      className={cn(className)}
    >
      <div className="flex h-full min-h-0 items-stretch p-3">
        {media ? (
          <div
            ref={containerRef}
            className="h-full min-h-[12rem] w-full overflow-hidden rounded-md bg-foreground/90 [&_iframe]:h-full [&_iframe]:w-full"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-md bg-[radial-gradient(ellipse_at_center,_oklch(0.32_0.02_55)_0%,_oklch(0.18_0.02_55)_70%)] text-center">
            <Text
              size="sm"
              className="font-medium tracking-[0.2em] text-primary-foreground/70 uppercase"
            >
              Waiting for the first track
            </Text>
            <Text size="sm" className="max-w-xs text-primary-foreground/45">
              When the playlist starts, the active YouTube video will play here.
            </Text>
          </div>
        )}
      </div>
    </DeskPanel>
  );
}
