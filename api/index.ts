import "dotenv/config";
import "reflect-metadata";
import { createHttpServer } from "../apps/api/src/createHttpServer.js";

const httpServer = await createHttpServer();

export default httpServer;
