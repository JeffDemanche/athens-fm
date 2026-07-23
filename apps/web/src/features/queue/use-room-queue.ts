import { useMutation, useQuery, useSubscription } from "@apollo/client/react";
import { useCallback, useMemo } from "react";
import {
  GET_QUEUE_ITEMS,
  MY_QUEUE_VOTES,
  POP_QUEUE_ITEM,
  QUEUE_ITEM_ADDED,
  QUEUE_ITEM_POPPED,
  QUEUE_ITEM_UPDATED,
  VOTE_ON_QUEUE_ITEM,
  sortQueueItemsByVotes,
  type MyQueueVoteFields,
  type QueueItemFields,
  type VoteValue,
} from "@/graphql/queue-items";

type GetQueueItemsResult = {
  queueItems: QueueItemFields[];
};

type MyQueueVotesResult = {
  myQueueVotes: MyQueueVoteFields[];
};

type QueueItemAddedResult = {
  queueItemAdded: QueueItemFields;
};

type QueueItemPoppedResult = {
  queueItemPopped: QueueItemFields;
};

type QueueItemUpdatedResult = {
  queueItemUpdated: QueueItemFields;
};

type PopQueueItemResult = {
  popQueueItem: QueueItemFields;
};

type VoteOnQueueItemResult = {
  voteOnQueueItem: {
    value: VoteValue | null;
    queueItem: QueueItemFields;
  };
};

type RoomIdVars = {
  roomId: string;
};

type MyVotesVars = {
  roomId: string;
  participantId: string;
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

function upsertItemInCache(
  cache: {
    updateQuery: typeof import("@apollo/client").ApolloCache.prototype.updateQuery;
  },
  roomId: string,
  item: QueueItemFields,
) {
  cache.updateQuery(
    { query: GET_QUEUE_ITEMS, variables: { roomId } },
    (existing: GetQueueItemsResult | null) => {
      const current = existing?.queueItems ?? [];
      const without = current.filter((entry) => entry.id !== item.id);
      return { queueItems: sortQueueItemsByVotes([...without, item]) };
    },
  );
}

function setMyVoteInCache(
  cache: {
    updateQuery: typeof import("@apollo/client").ApolloCache.prototype.updateQuery;
  },
  variables: MyVotesVars,
  queueItemId: string,
  value: VoteValue | null,
) {
  cache.updateQuery(
    { query: MY_QUEUE_VOTES, variables },
    (existing: MyQueueVotesResult | null) => {
      const current = existing?.myQueueVotes ?? [];
      const without = current.filter(
        (entry) => entry.queueItemId !== queueItemId,
      );
      if (value == null) {
        return { myQueueVotes: without };
      }
      return {
        myQueueVotes: [...without, { queueItemId, value }],
      };
    },
  );
}

/** Seeds the room queue and keeps it live via add/pop/update subscriptions. */
export function useRoomQueue(
  roomId: string,
  viewerParticipantId?: string | null,
) {
  const viewerId = viewerParticipantId ?? null;

  const { data, loading, error } = useQuery<GetQueueItemsResult, RoomIdVars>(
    GET_QUEUE_ITEMS,
    {
      variables: { roomId },
      skip: !roomId,
    },
  );

  const { data: votesData } = useQuery<MyQueueVotesResult, MyVotesVars>(
    MY_QUEUE_VOTES,
    {
      variables: { roomId, participantId: viewerId ?? "" },
      skip: !roomId || !viewerId,
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
      upsertItemInCache(client.cache, roomId, item);
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

  useSubscription<QueueItemUpdatedResult, RoomIdVars>(QUEUE_ITEM_UPDATED, {
    variables: { roomId },
    skip: !roomId,
    onData: ({ client, data: subscriptionData }) => {
      const item = subscriptionData.data?.queueItemUpdated;
      if (!item || item.finished) {
        return;
      }
      upsertItemInCache(client.cache, roomId, item);
    },
  });

  const [popQueueItemMutation] = useMutation<
    PopQueueItemResult,
    { id: string }
  >(POP_QUEUE_ITEM);

  const [voteOnQueueItemMutation] = useMutation<
    VoteOnQueueItemResult,
    { participantId: string; queueItemId: string; value: VoteValue }
  >(VOTE_ON_QUEUE_ITEM);

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

  const voteOnQueueItem = useCallback(
    async (queueItemId: string, value: VoteValue) => {
      if (!roomId || !viewerId || !queueItemId) {
        return;
      }

      await voteOnQueueItemMutation({
        variables: {
          participantId: viewerId,
          queueItemId,
          value,
        },
        update(cache, result) {
          const payload = result.data?.voteOnQueueItem;
          if (!payload) {
            return;
          }
          upsertItemInCache(cache, roomId, payload.queueItem);
          setMyVoteInCache(
            cache,
            { roomId, participantId: viewerId },
            queueItemId,
            payload.value,
          );
        },
      });
    },
    [roomId, viewerId, voteOnQueueItemMutation],
  );

  const voteByItemId = useMemo(() => {
    const map = new Map<string, VoteValue>();
    for (const vote of votesData?.myQueueVotes ?? []) {
      map.set(vote.queueItemId, vote.value);
    }
    return map;
  }, [votesData?.myQueueVotes]);

  const items = useMemo(
    () =>
      (data?.queueItems ?? []).map((item) => ({
        ...item,
        viewerVote: voteByItemId.get(item.id) ?? null,
      })),
    [data?.queueItems, voteByItemId],
  );

  return {
    items,
    loading,
    error,
    popQueueItem,
    voteOnQueueItem,
  };
}
