import { DeskPanel } from "@/composites/desk-panel";
import { useRoomQueue } from "@/features/queue/use-room-queue";
import { Text } from "@/primitives/text";
import { cn } from "@/lib/utils";

type ParticipantQueueProps = {
  roomId: string;
  className?: string;
};

export function ParticipantQueue({ roomId, className }: ParticipantQueueProps) {
  const { items, loading } = useRoomQueue(roomId);

  return (
    <DeskPanel
      title="Queue"
      description="Tracks people have submitted"
      className={cn(className)}
    >
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center px-4 py-6">
          <Text tone="muted" size="sm">
            Loading queue…
          </Text>
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center px-4 py-6">
          <Text tone="muted" size="sm">
            Nothing in the queue yet. Add the first track above.
          </Text>
        </div>
      ) : (
        <ol className="flex gap-3 overflow-x-auto px-4 py-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                "w-44 shrink-0 rounded-md border p-2",
                index === 0
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/70 bg-background/80",
              )}
            >
              <div className="mb-2 aspect-video overflow-hidden rounded bg-muted">
                <img
                  src={item.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <Text as="p" size="sm" className="line-clamp-2 font-medium">
                #{index + 1} · {item.title}
              </Text>
              <Text as="p" size="sm" tone="muted" className="truncate text-xs">
                {index === 0 ? "Now playing" : "Queued"}
              </Text>
            </li>
          ))}
        </ol>
      )}
    </DeskPanel>
  );
}
