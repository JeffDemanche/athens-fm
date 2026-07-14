import { gql } from "@apollo/client";

export const JOIN_ROOM = gql`
  mutation JoinRoom($roomId: ID!) {
    joinRoom(roomId: $roomId) {
      id
      roomId
      role
      createdAt
      updatedAt
      room {
        id
        shortId
        name
      }
    }
  }
`;

export const LEAVE_ROOM = gql`
  mutation LeaveRoom($participantId: ID!) {
    leaveRoom(participantId: $participantId)
  }
`;
