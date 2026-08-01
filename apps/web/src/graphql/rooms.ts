import { gql } from "@apollo/client";

export const ROOM_SETTINGS_FIELDS = gql`
  fragment RoomSettingsFields on Room {
    skipQuorumPercent
    volumeQuorumPercent
    maxSubmissionDurationMinutes
    maxSimultaneousSubmissions
  }
`;

export const GET_ROOM = gql`
  query GetRoom($id: ID!) {
    room(id: $id) {
      id
      shortId
      name
      skipQuorumPercent
      volumeQuorumPercent
      maxSubmissionDurationMinutes
      maxSimultaneousSubmissions
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
        skipQuorumPercent
        volumeQuorumPercent
        maxSubmissionDurationMinutes
        maxSimultaneousSubmissions
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

export const UPDATE_ROOM_SETTINGS = gql`
  mutation UpdateRoomSettings($participantId: ID!, $input: RoomSettingsInput!) {
    updateRoomSettings(participantId: $participantId, input: $input) {
      id
      skipQuorumPercent
      volumeQuorumPercent
      maxSubmissionDurationMinutes
      maxSimultaneousSubmissions
      updatedAt
    }
  }
`;

export type RoomSettingsFields = {
  skipQuorumPercent: number;
  volumeQuorumPercent: number;
  maxSubmissionDurationMinutes: number | null;
  maxSimultaneousSubmissions: number | null;
};

export type RoomFields = {
  id: string;
  shortId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
} & RoomSettingsFields;

export type ParticipantFields = {
  id: string;
  roomId: string;
  name: string | null;
  role: "HOST" | "GUEST";
  createdAt: string;
  updatedAt: string;
};

export type RoomSettingsInput = {
  skipQuorumPercent: number;
  volumeQuorumPercent: number;
  maxSubmissionDurationMinutes: number | null;
  maxSimultaneousSubmissions: number | null;
};
