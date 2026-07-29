import { gql } from "@apollo/client";

export const ROOM_EVENT_FIELDS = gql`
  fragment RoomEventFields on RoomEvent {
    id
    roomId
    participantId
    participantName
    participantRole
    type
    detail
    createdAt
  }
`;

export const GET_ROOM_EVENTS = gql`
  query GetRoomEvents($roomId: ID!) {
    roomEvents(roomId: $roomId) {
      ...RoomEventFields
    }
  }
  ${ROOM_EVENT_FIELDS}
`;

export const ROOM_EVENT_ADDED = gql`
  subscription RoomEventAdded($roomId: ID!) {
    roomEventAdded(roomId: $roomId) {
      ...RoomEventFields
    }
  }
  ${ROOM_EVENT_FIELDS}
`;

export type RoomEventFields = {
  id: string;
  roomId: string;
  participantId: string;
  participantName: string | null;
  participantRole: "HOST" | "GUEST";
  type:
    | "JOINED"
    | "LEFT"
    | "ITEM_SUBMITTED"
    | "BECAME_INACTIVE"
    | "NOW_PLAYING";
  detail: string | null;
  createdAt: string;
};
