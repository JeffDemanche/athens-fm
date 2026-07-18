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

export type QueueItemType = "YOUTUBE";

export type QueueItemFields = {
  id: string;
  roomId: string;
  participantId: string;
  type: QueueItemType;
  externalId: string;
  title: string;
  thumbnailUrl: string;
  finished: boolean;
  embedUrl: string;
  createdAt: string;
};
