import { gql } from "@apollo/client";

export const JOIN_ROOM = gql`
  mutation JoinRoom($roomId: ID!, $name: String!) {
    joinRoom(roomId: $roomId, name: $name) {
      id
      roomId
      name
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
