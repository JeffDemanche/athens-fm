import { roomService, type RoomService } from "../services/roomService.js";

export type GraphQLContext = {
  services: {
    room: RoomService;
  };
};

export function createGraphQLContext(): GraphQLContext {
  return {
    services: {
      room: roomService,
    },
  };
}
