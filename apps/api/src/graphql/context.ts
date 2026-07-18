import {
  participantService,
  type ParticipantService,
} from "../services/participantService.js";
import {
  queueItemService,
  type QueueItemService,
} from "../services/queueItemService.js";
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
    queueItem: QueueItemService;
  };
};

export function createGraphQLContext(): GraphQLContext {
  return {
    services: {
      room: roomService,
      participant: participantService,
      roomEvent: roomEventService,
      queueItem: queueItemService,
    },
  };
}
