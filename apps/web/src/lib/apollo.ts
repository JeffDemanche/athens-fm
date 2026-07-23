import { ApolloClient, HttpLink, InMemoryCache, split } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

const graphqlUri = import.meta.env.VITE_GRAPHQL_URL ?? "/api/graphql";

function graphqlWsUrl(): string {
  if (/^https?:\/\//i.test(graphqlUri)) {
    return graphqlUri.replace(/^http/i, "ws");
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${graphqlUri}`;
}

const httpLink = new HttpLink({ uri: graphqlUri });

const wsLink =
  typeof window !== "undefined" && typeof WebSocket !== "undefined"
    ? new GraphQLWsLink(
        createClient({
          url: graphqlWsUrl(),
          lazy: true,
          // Vercel Functions close WebSockets at maxDuration; keep retrying with backoff.
          retryAttempts: Number.POSITIVE_INFINITY,
          shouldRetry: () => true,
          retryWait: async (retries) => {
            const delayMs = Math.min(1000 * 2 ** retries, 30_000);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          },
        }),
      )
    : null;

const link = wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === "OperationDefinition" &&
          definition.operation === "subscription"
        );
      },
      wsLink,
      httpLink,
    )
  : httpLink;

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
  },
});
