import { buildSchema } from "type-graphql";
import type { GraphQLSchema } from "graphql";
import { ParticipantResolver } from "./resolvers/ParticipantResolver.js";
import { RoomResolver } from "./resolvers/RoomResolver.js";

let schemaPromise: Promise<GraphQLSchema> | null = null;

export function buildGraphQLSchema(): Promise<GraphQLSchema> {
  if (!schemaPromise) {
    schemaPromise = buildSchema({
      resolvers: [RoomResolver, ParticipantResolver],
      validate: false,
    });
  }

  return schemaPromise;
}
