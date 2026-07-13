import { ApolloServer } from "@apollo/server";
import { resolvers } from "./resolvers/index.js";
import { typeDefs } from "./typeDefs.js";
import type { GraphQLContext } from "./context.js";

export function createApolloServer() {
  return new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
  });
}
