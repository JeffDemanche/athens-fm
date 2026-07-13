import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const graphqlUri =
  import.meta.env.VITE_GRAPHQL_URL ?? "/api/graphql";

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: graphqlUri }),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
  },
});
