import { gql } from "@apollo/client";

export const GET_ROOM = gql`
  query GetRoom($id: ID!) {
    room(id: $id) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_ROOM = gql`
  mutation CreateRoom($name: String!) {
    createRoom(name: $name) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;

export type RoomFields = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};
