import { useMutation, useQuery, useSubscription } from "@apollo/client/react";
import { useCallback } from "react";
import {
  GET_QUEUE_ITEMS,
  POP_QUEUE_ITEM,
  QUEUE_ITEM_ADDED,
  QUEUE_ITEM_POPPED,
  type QueueItemFields,
} from "@/graphql/queue-items";

type GetQueueItemsResult = {
  queueItems: QueueItemFields[];
};

type QueueItemAddedResult = {
  queueItemAdded: QueueItemFields;
};

type QueueItemPoppedResult = {
  queueItemPopped: QueueItemFields;
};

type PopQueueItemResult = {
  popQueueItem: QueueItemFields;
};

type RoomIdVars = {
  roomId: string;
};

function removeItemFromCache(
  cache: {
    updateQuery: typeof import("@apollo/client").ApolloCache.prototype.updateQuery;
  },
  roomId: string,
  itemId: string,
) {
  cache.updateQuery(
    { query: GET_QUEUE_ITEMS, variables: { roomId } },
    (existing: GetQueueItemsResult | null) => {
      const current = existing?.queueItems ?? [];
      const next = current.filter((entry) => entry.id !== itemId);
      if (next.length === current.length) {
        return existing ?? { queueItems: current };
      }
      return { queueItems: next };
    },
  );
}

/** Seeds the room queue and keeps it live via add/pop subscriptions. */
export function useRoomQueue(roomId: string) {
  const { data, loading, error } = useQuery<GetQueueItemsResult, RoomIdVars>(
    GET_QUEUE_ITEMS,
    {
      variables: { roomId },
      skip: !roomId,
    },
  );

  useSubscription<QueueItemAddedResult, RoomIdVars>(QUEUE_ITEM_ADDED, {
    variables: { roomId },
    skip: !roomId,
    onData: ({ client, data: subscriptionData }) => {
      const item = subscriptionData.data?.queueItemAdded;
      if (!item || item.finished) {
        return;
      }

      client.cache.updateQuery<GetQueueItemsResult, RoomIdVars>(
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

  useSubscription<QueueItemPoppedResult, RoomIdVars>(QUEUE_ITEM_POPPED, {
    variables: { roomId },
    skip: !roomId,
    onData: ({ client, data: subscriptionData }) => {
      const item = subscriptionData.data?.queueItemPopped;
      if (!item) {
        return;
      }
      removeItemFromCache(client.cache, roomId, item.id);
    },
  });

  const [popQueueItemMutation] = useMutation<
    PopQueueItemResult,
    { id: string }
  >(POP_QUEUE_ITEM);

  const popQueueItem = useCallback(
    async (id: string) => {
      if (!roomId || !id) {
        return;
      }

      await popQueueItemMutation({
        variables: { id },
        update(cache, result) {
          const item = result.data?.popQueueItem;
          if (!item) {
            return;
          }
          removeItemFromCache(cache, roomId, item.id);
        },
      });
    },
    [popQueueItemMutation, roomId],
  );

  return {
    items: data?.queueItems ?? [],
    loading,
    error,
    popQueueItem,
  };
}
