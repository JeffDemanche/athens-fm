import { useNowPlaying } from "@/features/queue/use-now-playing";
import { Text } from "@/primitives/text";
import { cn } from "@/lib/utils";

type NowPlayingThumbnailProps = {
  roomId: string;
  className?: string;
};

/** Large thumbnail for the soft-popped track currently on the host desk. */
export function NowPlayingThumbnail({
  roomId,
  className,
}: NowPlayingThumbnailProps) {
  const { nowPlaying, loading } = useNowPlaying(roomId);

  if (!nowPlaying) {
    if (loading) {
      return (
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-border/70 bg-muted/40",
            className,
          )}
        >
          <div className="aspect-video animate-pulse bg-muted" />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex aspect-video flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 text-center",
          className,
        )}
      >
        <Text
          size="sm"
          className="font-medium tracking-[0.16em] text-muted-foreground uppercase"
        >
          Now playing
        </Text>
        <Text size="sm" tone="muted">
          Waiting for the host to start a track
        </Text>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border/70 bg-card/90",
        className,
      )}
    >
      <div className="relative aspect-video bg-muted">
        <img
          src={nowPlaying.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/55 to-transparent px-3 pt-10 pb-3">
          <Text
            as="p"
            size="sm"
            className="font-medium tracking-[0.16em] text-muted-foreground uppercase"
          >
            Now playing
          </Text>
          <Text as="p" className="mt-0.5 line-clamp-2 font-medium">
            {nowPlaying.title}
          </Text>
          {nowPlaying.participant?.name ? (
            <Text as="p" size="sm" tone="muted" className="mt-0.5 truncate">
              Added by {nowPlaying.participant.name}
            </Text>
          ) : null}
        </div>
      </div>
    </div>
  );
}
