import { gql } from "@apollo/client";

export const SKIP_VOTE_STATE_FIELDS = gql`
  fragment SkipVoteStateFields on SkipVoteState {
    roomId
    queueItemId
    voteCount
    participantCount
    threshold
    passed
    viewerHasVoted
  }
`;

export const GET_SKIP_VOTE_STATE = gql`
  query GetSkipVoteState($roomId: ID!, $participantId: ID) {
    skipVoteState(roomId: $roomId, participantId: $participantId) {
      ...SkipVoteStateFields
    }
  }
  ${SKIP_VOTE_STATE_FIELDS}
`;

export const SKIP_VOTE_STATE_UPDATED = gql`
  subscription SkipVoteStateUpdated($roomId: ID!) {
    skipVoteStateUpdated(roomId: $roomId) {
      ...SkipVoteStateFields
    }
  }
  ${SKIP_VOTE_STATE_FIELDS}
`;

export const TOGGLE_SKIP_VOTE = gql`
  mutation ToggleSkipVote($participantId: ID!) {
    toggleSkipVote(participantId: $participantId) {
      ...SkipVoteStateFields
    }
  }
  ${SKIP_VOTE_STATE_FIELDS}
`;

export const CLEAR_NOW_PLAYING = gql`
  mutation ClearNowPlaying($roomId: ID!) {
    clearNowPlaying(roomId: $roomId) {
      ...SkipVoteStateFields
    }
  }
  ${SKIP_VOTE_STATE_FIELDS}
`;

export type SkipVoteStateFields = {
  roomId: string;
  queueItemId: string | null;
  voteCount: number;
  participantCount: number;
  threshold: number;
  passed: boolean;
  viewerHasVoted: boolean;
};
