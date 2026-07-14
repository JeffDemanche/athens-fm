import {
  participantService,
  type ParticipantService,
} from "../services/participantService.js";
import {
  roomEventService,
  type RoomEventService,
} from "../services/roomEventService.js";
import { roomService, type RoomService } from "../services/roomService.js";

export type GraphQLContext = {
  services: {
    room: RoomService;
    participant: ParticipantService;
    roomEvent: RoomEventService;
  };
};

export function createGraphQLContext(): GraphQLContext {
  return {
    services: {
      room: roomService,
      participant: participantService,
      roomEvent: roomEventService,
    },
  };
}
