import { buildSchema } from "type-graphql";
import type { GraphQLSchema } from "graphql";
import { pubSub } from "./pubsub.js";
import { ParticipantResolver } from "./resolvers/ParticipantResolver.js";
import { QueueItemResolver } from "./resolvers/QueueItemResolver.js";
import { RoomEventResolver } from "./resolvers/RoomEventResolver.js";
import { RoomResolver } from "./resolvers/RoomResolver.js";
import { VoteResolver } from "./resolvers/VoteResolver.js";

let schemaPromise: Promise<GraphQLSchema> | null = null;

export function buildGraphQLSchema(): Promise<GraphQLSchema> {
  if (!schemaPromise) {
    schemaPromise = buildSchema({
      resolvers: [
        RoomResolver,
        ParticipantResolver,
        RoomEventResolver,
        QueueItemResolver,
        VoteResolver,
      ],
      pubSub,
      validate: false,
    });
  }

  return schemaPromise;
}
