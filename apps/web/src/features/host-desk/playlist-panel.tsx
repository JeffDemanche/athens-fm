import { DeskPanel } from "@/composites/desk-panel";
import type { QueueItemFields } from "@/graphql/queue-items";
import { Text } from "@/primitives/text";
import { cn } from "@/lib/utils";

type PlaylistPanelProps = {
  className?: string;
  items?: QueueItemFields[];
};

function providerLabel(type: QueueItemFields["type"]): string {
  switch (type) {
    case "YOUTUBE":
      return "YouTube";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function PlaylistPanel({ className, items = [] }: PlaylistPanelProps) {
  return (
    <DeskPanel
      title="Playlist"
      description="Queue in submission order"
      className={cn("shrink-0", className)}
    >
      {items.length === 0 ? (
        <div className="flex items-center justify-center px-4 py-8">
          <Text tone="muted" size="sm">
            Queue tracks will line up here.
          </Text>
        </div>
      ) : (
        <ol className="flex gap-3 overflow-x-auto px-4 py-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                "flex w-48 shrink-0 flex-col gap-2 rounded-md border p-3",
                index === 0
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/70 bg-background/80",
              )}
            >
              <div className="relative aspect-video overflow-hidden rounded bg-muted">
                <img
                  src={item.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <Text
                  size="sm"
                  className="absolute bottom-1.5 left-1.5 rounded bg-background/85 px-1.5 py-0.5 font-mono text-xs"
                >
                  #{index + 1}
                </Text>
              </div>
              <div className="min-w-0">
                <Text as="p" size="sm" className="line-clamp-2 font-medium">
                  {item.title}
                </Text>
                <Text as="p" size="sm" tone="muted" className="truncate text-xs">
                  {providerLabel(item.type)}
                  {index === 0 ? " · Now playing" : ""}
                </Text>
              </div>
            </li>
          ))}
        </ol>
      )}
    </DeskPanel>
  );
}
