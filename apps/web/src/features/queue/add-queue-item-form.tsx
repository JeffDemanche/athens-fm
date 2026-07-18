import { useMutation } from "@apollo/client/react";
import { useState, type FormEvent } from "react";
import {
  ADD_QUEUE_ITEM,
  GET_QUEUE_ITEMS,
  type QueueItemFields,
} from "@/graphql/queue-items";
import { Button } from "@/primitives/button";
import { Input } from "@/primitives/input";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";

type AddQueueItemResult = {
  addQueueItem: QueueItemFields;
};

type AddQueueItemVars = {
  participantId: string;
  type: "YOUTUBE";
  mediaRef: string;
};

type GetQueueItemsResult = {
  queueItems: QueueItemFields[];
};

type AddQueueItemFormProps = {
  participantId: string;
  roomId: string;
};

export function AddQueueItemForm({
  participantId,
  roomId,
}: AddQueueItemFormProps) {
  const [mediaRef, setMediaRef] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [addQueueItem, { loading }] = useMutation<
    AddQueueItemResult,
    AddQueueItemVars
  >(ADD_QUEUE_ITEM);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmed = mediaRef.trim();
    if (!trimmed) {
      return;
    }

    try {
      await addQueueItem({
        variables: {
          participantId,
          type: "YOUTUBE",
          mediaRef: trimmed,
        },
        update(cache, result) {
          const item = result.data?.addQueueItem;
          if (!item) {
            return;
          }

          cache.updateQuery<GetQueueItemsResult>(
            { query: GET_QUEUE_ITEMS, variables: { roomId } },
            (existing) => {
              const current = existing?.queueItems ?? [];
              if (current.some((entry) => entry.id === item.id)) {
                return existing ?? { queueItems: current };
              }
              return { queueItems: [...current, item] };
            },
          );
        },
      });
      setMediaRef("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to add that video",
      );
    }
  }

  return (
    <Stack
      gap="md"
      className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm"
    >
      <div>
        <Text size="lg">Add to the queue</Text>
        <Text tone="muted" size="sm" className="mt-1">
          Paste a YouTube link or video id. It shows up on the host desk in
          submission order.
        </Text>
      </div>
      <form onSubmit={onSubmit}>
        <Stack gap="md">
          <Input
            id="queue-media-ref"
            name="mediaRef"
            value={mediaRef}
            onChange={(event) => setMediaRef(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            required
            autoComplete="off"
            disabled={loading}
            aria-label="YouTube URL or video id"
          />
          {formError ? (
            <Text size="sm" tone="destructive">
              {formError}
            </Text>
          ) : null}
          <Button
            type="submit"
            className="h-12 w-full text-base"
            disabled={loading || !mediaRef.trim()}
          >
            {loading ? "Adding…" : "Add YouTube track"}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
