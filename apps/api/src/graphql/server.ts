import { ApolloServer } from "@apollo/server";
import type { GraphQLContext } from "./context.js";
import { buildGraphQLSchema } from "./schema.js";

export async function createApolloServer() {
  const schema = await buildGraphQLSchema();
  return new ApolloServer<GraphQLContext>({ schema });
}
