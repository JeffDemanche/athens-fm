import type { Server } from "node:http";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";
import { createGraphQLContext } from "./context.js";
import { buildGraphQLSchema } from "./schema.js";

export async function startSubscriptionServer(httpServer: Server) {
  const schema = await buildGraphQLSchema();
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/api/graphql",
  });

  const disposable = useServer(
    {
      schema,
      context: async () => createGraphQLContext(),
    },
    wsServer,
  );

  return {
    wsServer,
    async dispose() {
      await disposable.dispose();
      await new Promise<void>((resolve, reject) => {
        wsServer.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
