import request from "supertest";
import { createApp } from "../app.js";

describe("/api/internal/sweep-inactive", () => {
  const previousSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previousSecret;
    }
  });

  it("rejects when CRON_SECRET is missing or Authorization is wrong", async () => {
    delete process.env.CRON_SECRET;
    const app = await createApp();

    const noSecret = await request(app).get("/api/internal/sweep-inactive");
    expect(noSecret.status).toBe(401);

    process.env.CRON_SECRET = "test-cron-secret";
    const badAuth = await request(app)
      .get("/api/internal/sweep-inactive")
      .set("Authorization", "Bearer wrong");
    expect(badAuth.status).toBe(401);
  });

  it("runs the sweep when authorized (GET for Vercel Cron)", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const app = await createApp();

    const response = await request(app)
      .get("/api/internal/sweep-inactive")
      .set("Authorization", "Bearer test-cron-secret");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      sweptRoomCount: 0,
      roomIds: [],
    });
  });
});
