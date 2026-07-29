import { ApolloClient, HttpLink, InMemoryCache, split } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient, type Client as GraphqlWsClient } from "graphql-ws";

const graphqlUri = import.meta.env.VITE_GRAPHQL_URL ?? "/api/graphql";

function graphqlWsUrl(): string {
  if (/^https?:\/\//i.test(graphqlUri)) {
    return graphqlUri.replace(/^http/i, "ws");
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${graphqlUri}`;
}

/** Reload active queries after a WS drop — pub/sub events during the gap are gone. */
function refetchActiveQueries(client: ApolloClient): void {
  void client.refetchQueries({ include: "active" });
}

const httpLink = new HttpLink({ uri: graphqlUri });

let graphqlWsClient: GraphqlWsClient | null = null;

const wsLink =
  typeof window !== "undefined" && typeof WebSocket !== "undefined"
    ? new GraphQLWsLink(
        (graphqlWsClient = createClient({
          url: graphqlWsUrl(),
          lazy: true,
          // Detect half-open sockets quickly so we reconnect and refetch sooner.
          keepAlive: 12_000,
          // Vercel Functions close WebSockets at maxDuration; keep retrying with backoff.
          retryAttempts: Number.POSITIVE_INFINITY,
          shouldRetry: () => true,
          retryWait: async (retries) => {
            const delayMs = Math.min(1000 * 2 ** retries, 30_000);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          },
        })),
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

if (graphqlWsClient) {
  graphqlWsClient.on("connected", (_socket, _payload, wasRetry) => {
    if (wasRetry) {
      refetchActiveQueries(apolloClient);
    }
  });
}

if (typeof document !== "undefined") {
  let visibilityTimer: ReturnType<typeof setTimeout> | null = null;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") {
      return;
    }
    // Debounce so a quick background/foreground flip cannot race a live
    // subscription write with a stale in-flight HTTP response.
    if (visibilityTimer) {
      clearTimeout(visibilityTimer);
    }
    visibilityTimer = setTimeout(() => {
      visibilityTimer = null;
      refetchActiveQueries(apolloClient);
    }, 300);
  });
}
