import { gql } from "@apollo/client";

export const QUEUE_ITEM_FIELDS = gql`
  fragment QueueItemFields on QueueItem {
    id
    roomId
    participantId
    type
    externalId
    title
    thumbnailUrl
    finished
    score
    embedUrl
    createdAt
  }
`;

export const GET_QUEUE_ITEMS = gql`
  query GetQueueItems($roomId: ID!) {
    queueItems(roomId: $roomId) {
      ...QueueItemFields
    }
  }
  ${QUEUE_ITEM_FIELDS}
`;

export const MY_QUEUE_VOTES = gql`
  query MyQueueVotes($roomId: ID!, $participantId: ID!) {
    myQueueVotes(roomId: $roomId, participantId: $participantId) {
      queueItemId
      value
    }
  }
`;

export const QUEUE_ITEM_ADDED = gql`
  subscription QueueItemAdded($roomId: ID!) {
    queueItemAdded(roomId: $roomId) {
      ...QueueItemFields
    }
  }
  ${QUEUE_ITEM_FIELDS}
`;

export const QUEUE_ITEM_POPPED = gql`
  subscription QueueItemPopped($roomId: ID!) {
    queueItemPopped(roomId: $roomId) {
      ...QueueItemFields
    }
  }
  ${QUEUE_ITEM_FIELDS}
`;

export const QUEUE_ITEM_UPDATED = gql`
  subscription QueueItemUpdated($roomId: ID!) {
    queueItemUpdated(roomId: $roomId) {
      ...QueueItemFields
    }
  }
  ${QUEUE_ITEM_FIELDS}
`;

export const ADD_QUEUE_ITEM = gql`
  mutation AddQueueItem(
    $participantId: ID!
    $type: QueueItemType!
    $mediaRef: String!
  ) {
    addQueueItem(
      participantId: $participantId
      type: $type
      mediaRef: $mediaRef
    ) {
      ...QueueItemFields
    }
  }
  ${QUEUE_ITEM_FIELDS}
`;

export const POP_QUEUE_ITEM = gql`
  mutation PopQueueItem($id: ID!) {
    popQueueItem(id: $id) {
      ...QueueItemFields
    }
  }
  ${QUEUE_ITEM_FIELDS}
`;

export const VOTE_ON_QUEUE_ITEM = gql`
  mutation VoteOnQueueItem(
    $participantId: ID!
    $queueItemId: ID!
    $value: VoteValue!
  ) {
    voteOnQueueItem(
      participantId: $participantId
      queueItemId: $queueItemId
      value: $value
    ) {
      value
      queueItem {
        ...QueueItemFields
      }
    }
  }
  ${QUEUE_ITEM_FIELDS}
`;

export type QueueItemType = "YOUTUBE";

export type VoteValue = "UP" | "DOWN";

export type QueueItemFields = {
  id: string;
  roomId: string;
  participantId: string;
  type: QueueItemType;
  externalId: string;
  title: string;
  thumbnailUrl: string;
  finished: boolean;
  score: number;
  embedUrl: string;
  createdAt: string;
  viewerVote?: VoteValue | null;
};

export type MyQueueVoteFields = {
  queueItemId: string;
  value: VoteValue;
};

/** Match server order: score desc, then oldest submission first on ties. */
export function sortQueueItemsByVotes(
  items: QueueItemFields[],
): QueueItemFields[] {
  return [...items].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  });
}
