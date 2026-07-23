import { ChevronDown, ChevronUp } from "lucide-react";
import { DeskPanel } from "@/composites/desk-panel";
import { useRoomQueue } from "@/features/queue/use-room-queue";
import type { VoteValue } from "@/graphql/queue-items";
import { Button } from "@/primitives/button";
import { Text } from "@/primitives/text";
import { cn } from "@/lib/utils";

type ParticipantQueueProps = {
  roomId: string;
  participantId: string;
  className?: string;
};

export function ParticipantQueue({
  roomId,
  participantId,
  className,
}: ParticipantQueueProps) {
  const { items, loading, voteOnQueueItem } = useRoomQueue(
    roomId,
    participantId,
  );

  async function onVote(queueItemId: string, value: VoteValue) {
    try {
      await voteOnQueueItem(queueItemId, value);
    } catch {
      // Apollo surfaces GraphQL errors; keep the list interactive.
    }
  }

  return (
    <DeskPanel
      title="Queue"
      description="Sorted by votes — oldest wins ties"
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
          {items.map((item, index) => {
            const viewerVote = item.viewerVote ?? null;
            return (
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
                <Text
                  as="p"
                  size="sm"
                  tone="muted"
                  className="truncate text-xs"
                >
                  {index === 0 ? "Up next" : "Queued"} · {item.score}{" "}
                  {item.score === 1 || item.score === -1 ? "vote" : "votes"}
                </Text>
                <div className="mt-2 flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant={viewerVote === "UP" ? "default" : "outline"}
                    aria-label={
                      viewerVote === "UP" ? "Remove upvote" : "Upvote"
                    }
                    aria-pressed={viewerVote === "UP"}
                    onClick={() => {
                      void onVote(item.id, "UP");
                    }}
                  >
                    <ChevronUp />
                  </Button>
                  <Text
                    as="span"
                    size="sm"
                    className="min-w-6 text-center font-mono text-xs tabular-nums"
                  >
                    {item.score}
                  </Text>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant={viewerVote === "DOWN" ? "default" : "outline"}
                    aria-label={
                      viewerVote === "DOWN" ? "Remove downvote" : "Downvote"
                    }
                    aria-pressed={viewerVote === "DOWN"}
                    onClick={() => {
                      void onVote(item.id, "DOWN");
                    }}
                  >
                    <ChevronDown />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </DeskPanel>
  );
}
