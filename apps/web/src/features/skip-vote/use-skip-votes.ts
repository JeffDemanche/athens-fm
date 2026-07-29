import { useMutation, useQuery, useSubscription } from "@apollo/client/react";
import { useCallback, useRef } from "react";
import {
  CLEAR_NOW_PLAYING,
  GET_SKIP_VOTE_STATE,
  SKIP_VOTE_STATE_UPDATED,
  TOGGLE_SKIP_VOTE,
  type SkipVoteStateFields,
} from "@/graphql/skip-votes";

type GetSkipVoteStateResult = {
  skipVoteState: SkipVoteStateFields;
};

type SkipVoteStateUpdatedResult = {
  skipVoteStateUpdated: SkipVoteStateFields;
};

type ToggleSkipVoteResult = {
  toggleSkipVote: SkipVoteStateFields;
};

type ClearNowPlayingResult = {
  clearNowPlaying: SkipVoteStateFields;
};

type QueryVars = {
  roomId: string;
  participantId?: string | null;
};

function writeSkipState(
  cache: {
    writeQuery: typeof import("@apollo/client").ApolloCache.prototype.writeQuery;
  },
  roomId: string,
  participantId: string | null,
  state: SkipVoteStateFields,
  preserveViewerVote?: boolean,
  previousViewerHasVoted?: boolean,
) {
  cache.writeQuery({
    query: GET_SKIP_VOTE_STATE,
    variables: {
      roomId,
      participantId: participantId ?? null,
    },
    data: {
      skipVoteState: {
        ...state,
        viewerHasVoted: preserveViewerVote
          ? (previousViewerHasVoted ?? false)
          : state.viewerHasVoted,
      },
    },
  });
}

/** Live skip tally for a room; optional viewer id for personal toggle state. */
export function useSkipVotes(
  roomId: string,
  viewerParticipantId?: string | null,
) {
  const viewerId = viewerParticipantId ?? null;
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;
  const viewerIdRef = useRef(viewerId);
  viewerIdRef.current = viewerId;

  const { data, loading, error, refetch } = useQuery<
    GetSkipVoteStateResult,
    QueryVars
  >(GET_SKIP_VOTE_STATE, {
    variables: { roomId, participantId: viewerId },
    skip: !roomId,
    nextFetchPolicy: "cache-first",
  });

  const refetchState = useCallback(() => {
    if (!roomIdRef.current) {
      return;
    }
    void refetch();
  }, [refetch]);

  useSubscription<SkipVoteStateUpdatedResult, { roomId: string }>(
    SKIP_VOTE_STATE_UPDATED,
    {
      variables: { roomId },
      skip: !roomId,
      onData: ({ client, data: subscriptionData }) => {
        const incoming = subscriptionData.data?.skipVoteStateUpdated;
        if (!incoming) {
          return;
        }

        const current = client.cache.readQuery<
          GetSkipVoteStateResult,
          QueryVars
        >({
          query: GET_SKIP_VOTE_STATE,
          variables: {
            roomId: roomIdRef.current,
            participantId: viewerIdRef.current,
          },
        });

        const previous = current?.skipVoteState;
        const trackChanged =
          (previous?.queueItemId ?? null) !== (incoming.queueItemId ?? null);
        // Pop reset clears everyone's vote; otherwise keep this viewer's toggle
        // because pub/sub payloads are not viewer-specific.
        const preserveViewerVote = !trackChanged && Boolean(incoming.queueItemId);

        writeSkipState(
          client.cache,
          roomIdRef.current,
          viewerIdRef.current,
          incoming,
          preserveViewerVote,
          previous?.viewerHasVoted,
        );
      },
      onError: refetchState,
    },
  );

  const [toggleMutation] = useMutation<
    ToggleSkipVoteResult,
    { participantId: string }
  >(TOGGLE_SKIP_VOTE);

  const [clearMutation] = useMutation<
    ClearNowPlayingResult,
    { roomId: string }
  >(CLEAR_NOW_PLAYING);

  const toggleSkipVote = useCallback(async () => {
    if (!roomId || !viewerId) {
      return;
    }

    await toggleMutation({
      variables: { participantId: viewerId },
      update(cache, result) {
        const state = result.data?.toggleSkipVote;
        if (!state) {
          return;
        }
        writeSkipState(cache, roomId, viewerId, state);
      },
    });
  }, [roomId, viewerId, toggleMutation]);

  const clearNowPlaying = useCallback(async () => {
    if (!roomId) {
      return;
    }

    await clearMutation({
      variables: { roomId },
      update(cache, result) {
        const state = result.data?.clearNowPlaying;
        if (!state) {
          return;
        }
        writeSkipState(cache, roomId, viewerId, state);
      },
    });
  }, [roomId, viewerId, clearMutation]);

  return {
    state: data?.skipVoteState ?? null,
    loading,
    error,
    toggleSkipVote,
    clearNowPlaying,
  };
}
