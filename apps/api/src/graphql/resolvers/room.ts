import type { GraphQLContext } from "../context.js";
import type { Room } from "../../types/room.js";

function serializeRoom(room: Room) {
  return {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

export const roomResolvers = {
  Query: {
    room: async (
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext,
    ) => {
      const room = await context.services.room.getById(args.id);
      return room ? serializeRoom(room) : null;
    },

    rooms: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const rooms = await context.services.room.list();
      return rooms.map(serializeRoom);
    },
  },

  Mutation: {
    createRoom: async (
      _parent: unknown,
      args: { name: string },
      context: GraphQLContext,
    ) => {
      const room = await context.services.room.create(args.name);
      return serializeRoom(room);
    },
  },
};
