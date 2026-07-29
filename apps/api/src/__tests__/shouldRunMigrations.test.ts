import {
  migrationsSkipReason,
  shouldRunMigrations,
} from "../migrations/shouldRun.js";

describe("shouldRunMigrations", () => {
  it("runs by default", () => {
    expect(shouldRunMigrations({})).toBe(true);
    expect(migrationsSkipReason({})).toBeNull();
  });

  it("skips when SKIP_DB_MIGRATIONS=1", () => {
    expect(shouldRunMigrations({ SKIP_DB_MIGRATIONS: "1" })).toBe(false);
    expect(migrationsSkipReason({ SKIP_DB_MIGRATIONS: "1" })).toBe(
      "SKIP_DB_MIGRATIONS=1",
    );
  });

  it("skips on Vercel preview deployments", () => {
    expect(shouldRunMigrations({ VERCEL_ENV: "preview" })).toBe(false);
    expect(migrationsSkipReason({ VERCEL_ENV: "preview" })).toBe(
      "VERCEL_ENV=preview",
    );
  });

  it("runs on Vercel production", () => {
    expect(shouldRunMigrations({ VERCEL_ENV: "production" })).toBe(true);
  });
});
