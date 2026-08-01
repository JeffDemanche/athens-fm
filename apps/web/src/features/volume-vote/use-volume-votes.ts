import { useMutation, useQuery, useSubscription } from "@apollo/client/react";
import { useCallback, useRef } from "react";
import {
  ACKNOWLEDGE_VOLUME_NUDGE,
  GET_VOLUME_VOTE_STATE,
  SET_VOLUME_VOTE,
  VOLUME_VOTE_STATE_UPDATED,
  type VolumeVoteStateFields,
  type VolumeVoteValue,
} from "@/graphql/volume-votes";

type GetVolumeVoteStateResult = {
  volumeVoteState: VolumeVoteStateFields;
};

type VolumeVoteStateUpdatedResult = {
  volumeVoteStateUpdated: VolumeVoteStateFields;
};

type SetVolumeVoteResult = {
  setVolumeVote: VolumeVoteStateFields;
};

type AcknowledgeVolumeNudgeResult = {
  acknowledgeVolumeNudge: VolumeVoteStateFields;
};

type QueryVars = {
  roomId: string;
  participantId?: string | null;
};

function writeVolumeState(
  cache: {
    writeQuery: typeof import("@apollo/client").ApolloCache.prototype.writeQuery;
  },
  roomId: string,
  participantId: string | null,
  state: VolumeVoteStateFields,
  preserveViewerVote?: boolean,
  previousViewerVote?: VolumeVoteValue,
) {
  cache.writeQuery({
    query: GET_VOLUME_VOTE_STATE,
    variables: {
      roomId,
      participantId: participantId ?? null,
    },
    data: {
      volumeVoteState: {
        ...state,
        viewerVote: preserveViewerVote
          ? (previousViewerVote ?? "NONE")
          : state.viewerVote,
      },
    },
  });
}

/** Live volume-vote tally for a room; optional viewer id for personal choice. */
export function useVolumeVotes(
  roomId: string,
  viewerParticipantId?: string | null,
) {
  const viewerId = viewerParticipantId ?? null;
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;
  const viewerIdRef = useRef(viewerId);
  viewerIdRef.current = viewerId;

  const { data, loading, error, refetch } = useQuery<
    GetVolumeVoteStateResult,
    QueryVars
  >(GET_VOLUME_VOTE_STATE, {
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

  useSubscription<VolumeVoteStateUpdatedResult, { roomId: string }>(
    VOLUME_VOTE_STATE_UPDATED,
    {
      variables: { roomId },
      skip: !roomId,
      onData: ({ client, data: subscriptionData }) => {
        const incoming = subscriptionData.data?.volumeVoteStateUpdated;
        if (!incoming) {
          return;
        }

        const current = client.cache.readQuery<
          GetVolumeVoteStateResult,
          QueryVars
        >({
          query: GET_VOLUME_VOTE_STATE,
          variables: {
            roomId: roomIdRef.current,
            participantId: viewerIdRef.current,
          },
        });

        const previous = current?.volumeVoteState;
        const trackChanged =
          (previous?.queueItemId ?? null) !== (incoming.queueItemId ?? null);
        // Soft-pop / ack reset clears everyone's vote; otherwise keep this
        // viewer's choice because pub/sub payloads are not viewer-specific.
        const votesCleared =
          incoming.upCount === 0 &&
          incoming.downCount === 0 &&
          incoming.netCount === 0 &&
          !incoming.passed;
        const preserveViewerVote =
          !trackChanged &&
          Boolean(incoming.queueItemId) &&
          !votesCleared;

        writeVolumeState(
          client.cache,
          roomIdRef.current,
          viewerIdRef.current,
          incoming,
          preserveViewerVote,
          previous?.viewerVote,
        );
      },
      onError: refetchState,
    },
  );

  const [setMutation] = useMutation<
    SetVolumeVoteResult,
    { participantId: string; value: VolumeVoteValue }
  >(SET_VOLUME_VOTE);

  const [ackMutation] = useMutation<
    AcknowledgeVolumeNudgeResult,
    { roomId: string }
  >(ACKNOWLEDGE_VOLUME_NUDGE);

  const setVolumeVote = useCallback(
    async (value: VolumeVoteValue) => {
      if (!roomId || !viewerId) {
        return;
      }

      await setMutation({
        variables: { participantId: viewerId, value },
        update(cache, result) {
          const state = result.data?.setVolumeVote;
          if (!state) {
            return;
          }
          writeVolumeState(cache, roomId, viewerId, state);
        },
      });
    },
    [roomId, viewerId, setMutation],
  );

  const acknowledgeVolumeNudge = useCallback(async () => {
    if (!roomId) {
      return;
    }

    await ackMutation({
      variables: { roomId },
      update(cache, result) {
        const state = result.data?.acknowledgeVolumeNudge;
        if (!state) {
          return;
        }
        writeVolumeState(cache, roomId, viewerId, state);
      },
    });
  }, [roomId, viewerId, ackMutation]);

  return {
    state: data?.volumeVoteState ?? null,
    loading,
    error,
    setVolumeVote,
    acknowledgeVolumeNudge,
  };
}
