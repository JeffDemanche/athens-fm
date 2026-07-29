import { useQuery, useSubscription } from "@apollo/client/react";
import { useCallback, useRef } from "react";
import {
  GET_NOW_PLAYING,
  QUEUE_ITEM_POPPED,
  type QueueItemFields,
} from "@/graphql/queue-items";
import {
  SKIP_VOTE_STATE_UPDATED,
  type SkipVoteStateFields,
} from "@/graphql/skip-votes";

type GetNowPlayingResult = {
  room: {
    id: string;
    nowPlaying: QueueItemFields | null;
  } | null;
};

type QueueItemPoppedResult = {
  queueItemPopped: QueueItemFields;
};

type SkipVoteStateUpdatedResult = {
  skipVoteStateUpdated: SkipVoteStateFields;
};

type RoomIdVars = {
  roomId: string;
};

function writeNowPlaying(
  cache: {
    writeQuery: typeof import("@apollo/client").ApolloCache.prototype.writeQuery;
  },
  roomId: string,
  nowPlaying: QueueItemFields | null,
) {
  cache.writeQuery({
    query: GET_NOW_PLAYING,
    variables: { roomId },
    data: {
      room: {
        __typename: "Room",
        id: roomId,
        nowPlaying,
      },
    },
  });
}

/** Soft-popped track on the host desk — seeded via Room.nowPlaying, live via pop/clear. */
export function useNowPlaying(roomId: string) {
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  const { data, loading, error, refetch } = useQuery<
    GetNowPlayingResult,
    RoomIdVars
  >(GET_NOW_PLAYING, {
    variables: { roomId },
    skip: !roomId,
    nextFetchPolicy: "cache-first",
  });

  const refetchNowPlaying = useCallback(() => {
    if (!roomIdRef.current) {
      return;
    }
    void refetch();
  }, [refetch]);

  useSubscription<QueueItemPoppedResult, RoomIdVars>(QUEUE_ITEM_POPPED, {
    variables: { roomId },
    skip: !roomId,
    onData: ({ client, data: subscriptionData }) => {
      const item = subscriptionData.data?.queueItemPopped;
      if (!item) {
        return;
      }
      writeNowPlaying(client.cache, roomIdRef.current, item);
    },
    onError: refetchNowPlaying,
  });

  // clearNowPlaying (and idle desk) nulls queueItemId without a pop event.
  useSubscription<SkipVoteStateUpdatedResult, { roomId: string }>(
    SKIP_VOTE_STATE_UPDATED,
    {
      variables: { roomId },
      skip: !roomId,
      onData: ({ client, data: subscriptionData }) => {
        const incoming = subscriptionData.data?.skipVoteStateUpdated;
        if (!incoming || incoming.queueItemId) {
          return;
        }

        const current = client.cache.readQuery<
          GetNowPlayingResult,
          RoomIdVars
        >({
          query: GET_NOW_PLAYING,
          variables: { roomId: roomIdRef.current },
        });
        if (!current?.room?.nowPlaying) {
          return;
        }

        writeNowPlaying(client.cache, roomIdRef.current, null);
      },
      onError: refetchNowPlaying,
    },
  );

  return {
    nowPlaying: data?.room?.nowPlaying ?? null,
    loading,
    error,
  };
}
