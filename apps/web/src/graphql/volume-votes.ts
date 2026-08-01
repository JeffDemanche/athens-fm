import { gql } from "@apollo/client";

export const VOLUME_VOTE_STATE_FIELDS = gql`
  fragment VolumeVoteStateFields on VolumeVoteState {
    roomId
    queueItemId
    upCount
    downCount
    netCount
    participantCount
    threshold
    passed
    direction
    viewerVote
  }
`;

export const GET_VOLUME_VOTE_STATE = gql`
  query GetVolumeVoteState($roomId: ID!, $participantId: ID) {
    volumeVoteState(roomId: $roomId, participantId: $participantId) {
      ...VolumeVoteStateFields
    }
  }
  ${VOLUME_VOTE_STATE_FIELDS}
`;

export const VOLUME_VOTE_STATE_UPDATED = gql`
  subscription VolumeVoteStateUpdated($roomId: ID!) {
    volumeVoteStateUpdated(roomId: $roomId) {
      ...VolumeVoteStateFields
    }
  }
  ${VOLUME_VOTE_STATE_FIELDS}
`;

export const SET_VOLUME_VOTE = gql`
  mutation SetVolumeVote($participantId: ID!, $value: VolumeVoteValue!) {
    setVolumeVote(participantId: $participantId, value: $value) {
      ...VolumeVoteStateFields
    }
  }
  ${VOLUME_VOTE_STATE_FIELDS}
`;

export const ACKNOWLEDGE_VOLUME_NUDGE = gql`
  mutation AcknowledgeVolumeNudge($roomId: ID!) {
    acknowledgeVolumeNudge(roomId: $roomId) {
      ...VolumeVoteStateFields
    }
  }
  ${VOLUME_VOTE_STATE_FIELDS}
`;

export type VolumeVoteValue = "UP" | "DOWN" | "NONE";
export type VolumeVoteDirection = "UP" | "DOWN";

export type VolumeVoteStateFields = {
  roomId: string;
  queueItemId: string | null;
  upCount: number;
  downCount: number;
  netCount: number;
  participantCount: number;
  threshold: number;
  passed: boolean;
  direction: VolumeVoteDirection | null;
  viewerVote: VolumeVoteValue;
};

/** Percent of the 0–100 volume scale to nudge when quorum passes. */
export const VOLUME_NUDGE_PERCENT = 10;
