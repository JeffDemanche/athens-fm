import { useQuery, useSubscription } from "@apollo/client/react";
import {
  GET_QUEUE_ITEMS,
  QUEUE_ITEM_ADDED,
  type QueueItemFields,
} from "@/graphql/queue-items";

type GetQueueItemsResult = {
  queueItems: QueueItemFields[];
};

type QueueItemAddedResult = {
  queueItemAdded: QueueItemFields;
};

type RoomIdVars = {
  roomId: string;
};

/** Seeds the room queue and appends live additions via subscription. */
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
      if (!item) {
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

  return {
    items: data?.queueItems ?? [],
    loading,
    error,
  };
}
