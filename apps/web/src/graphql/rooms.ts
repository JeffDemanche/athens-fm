import { gql } from "@apollo/client";

export const GET_ROOM = gql`
  query GetRoom($id: ID!) {
    room(id: $id) {
      id
      shortId
      name
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_ROOM = gql`
  mutation CreateRoom($name: String!) {
    createRoom(name: $name) {
      room {
        id
        shortId
        name
        createdAt
        updatedAt
      }
      participant {
        id
        roomId
        name
        role
        createdAt
        updatedAt
      }
    }
  }
`;

export type RoomFields = {
  id: string;
  shortId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ParticipantFields = {
  id: string;
  roomId: string;
  name: string | null;
  role: "HOST" | "GUEST";
  createdAt: string;
  updatedAt: string;
};
