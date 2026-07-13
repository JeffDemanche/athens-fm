import request from "supertest";
import { createApp } from "../app.js";

describe("GET /api/health", () => {
  it("returns service health payload", async () => {
    const app = createApp();
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      service: "athens-fm-api",
      redis: "disconnected",
    });
    expect(typeof response.body.timestamp).toBe("string");
  });
});
