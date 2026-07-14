import { buildSchema } from "type-graphql";
import type { GraphQLSchema } from "graphql";
import { pubSub } from "./pubsub.js";
import { ParticipantResolver } from "./resolvers/ParticipantResolver.js";
import { RoomEventResolver } from "./resolvers/RoomEventResolver.js";
import { RoomResolver } from "./resolvers/RoomResolver.js";

let schemaPromise: Promise<GraphQLSchema> | null = null;

export function buildGraphQLSchema(): Promise<GraphQLSchema> {
  if (!schemaPromise) {
    schemaPromise = buildSchema({
      resolvers: [RoomResolver, ParticipantResolver, RoomEventResolver],
      pubSub,
      validate: false,
    });
  }

  return schemaPromise;
}
