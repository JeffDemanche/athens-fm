import {
  participantService,
  type ParticipantService,
} from "../services/participantService.js";
import { roomService, type RoomService } from "../services/roomService.js";

export type GraphQLContext = {
  services: {
    room: RoomService;
    participant: ParticipantService;
  };
};

export function createGraphQLContext(): GraphQLContext {
  return {
    services: {
      room: roomService,
      participant: participantService,
    },
  };
}
