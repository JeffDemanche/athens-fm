import type mongoose from "mongoose";

export type MongoDb = NonNullable<(typeof mongoose)["connection"]["db"]>;

/**
 * A single forward migration. Prefer idempotent `up` implementations so
 * retries / concurrent deploys cannot corrupt data.
 *
 * Id format: `YYYYMMDD_NNN_snake_description` (e.g. `20260728_001_backfill_queue_score`).
 */
export type Migration = {
  id: string;
  description: string;
  up: (ctx: MigrationContext) => Promise<void>;
};

export type MigrationContext = {
  /** Native MongoDB database handle (prefer for bulk transforms). */
  db: MongoDb;
  mongoose: typeof mongoose;
};

export type MigrationRunResult = {
  applied: string[];
  skipped: string[];
};
