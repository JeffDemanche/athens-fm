import { DeskPanel } from "@/composites/desk-panel";
import { Text } from "@/primitives/text";
import { cn } from "@/lib/utils";

type VideoViewerProps = {
  className?: string;
  videoId?: string | null;
  title?: string | null;
};

export function VideoViewer({
  className,
  videoId = null,
  title = null,
}: VideoViewerProps) {
  return (
    <DeskPanel
      title="Now playing"
      description={title ?? "YouTube embed for the current track"}
      className={cn(className)}
    >
      <div className="flex h-full min-h-0 items-stretch p-3">
        {videoId ? (
          <iframe
            title={title ?? "Now playing"}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full rounded-md bg-foreground/90"
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
