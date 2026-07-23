import "dotenv/config";
import "reflect-metadata";
import { createHttpServer } from "./createHttpServer.js";

const port = Number(process.env.PORT ?? 3001);

async function main() {
  const httpServer = await createHttpServer();

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`[api] listening on http://0.0.0.0:${port}`);
    console.log(`[api] GraphQL HTTP/WS at http://0.0.0.0:${port}/api/graphql`);
  });
}

void main();
