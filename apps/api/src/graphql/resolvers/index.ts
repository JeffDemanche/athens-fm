import { roomResolvers } from "./room.js";

export const resolvers = {
  Query: {
    ...roomResolvers.Query,
  },
  Mutation: {
    ...roomResolvers.Mutation,
  },
};
