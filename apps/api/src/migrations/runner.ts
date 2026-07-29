import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { migrations as defaultMigrations } from "./registry.js";
import type { Migration, MigrationRunResult, MongoDb } from "./types.js";

export const MIGRATIONS_COLLECTION = "_migrations";
export const MIGRATION_LOCK_COLLECTION = "_migration_locks";

const LOCK_ID = "startup";
const DEFAULT_LOCK_TTL_MS = 120_000;
const DEFAULT_WAIT_MS = 60_000;
const POLL_MS = 200;

type AppliedDoc = {
  _id: string;
  appliedAt: Date;
  description?: string;
};

type LockDoc = {
  _id: string;
  owner: string;
  expiresAt: Date;
};

export type RunMigrationsOptions = {
  /** Defaults to `mongoose.connection.db`. */
  db?: MongoDb;
  /** Defaults to the app registry. */
  migrations?: Migration[];
  lockTtlMs?: number;
  waitMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 11000
  );
}

function requireDb(db: MongoDb | undefined): MongoDb {
  if (!db) {
    throw new Error(
      "MongoDB is not connected — cannot run migrations (missing db handle)",
    );
  }
  return db;
}

async function listAppliedIds(db: MongoDb): Promise<Set<string>> {
  const docs = await db
    .collection<AppliedDoc>(MIGRATIONS_COLLECTION)
    .find({}, { projection: { _id: 1 } })
    .toArray();
  return new Set(docs.map((doc) => doc._id));
}

function pendingMigrations(
  all: Migration[],
  applied: Set<string>,
): Migration[] {
  return all.filter((migration) => !applied.has(migration.id));
}

async function acquireLock(
  db: MongoDb,
  ttlMs: number,
): Promise<{ owner: string; release: () => Promise<void> } | null> {
  const locks = db.collection<LockDoc>(MIGRATION_LOCK_COLLECTION);
  const now = new Date();
  const owner = randomUUID();
  const expiresAt = new Date(now.getTime() + ttlMs);

  await locks.deleteMany({ _id: LOCK_ID, expiresAt: { $lte: now } });

  try {
    await locks.insertOne({ _id: LOCK_ID, owner, expiresAt });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return null;
    }
    throw error;
  }

  return {
    owner,
    release: async () => {
      await locks.deleteOne({ _id: LOCK_ID, owner });
    },
  };
}

async function recordApplied(
  db: MongoDb,
  migration: Migration,
): Promise<void> {
  await db.collection<AppliedDoc>(MIGRATIONS_COLLECTION).insertOne({
    _id: migration.id,
    appliedAt: new Date(),
    description: migration.description,
  });
}

/**
 * Apply all pending migrations in registry order.
 * Uses a short-lived lock so concurrent API instances do not double-apply.
 * If the lock is held, waits until pending work is done (or throws on timeout).
 */
export async function runPendingMigrations(
  options: RunMigrationsOptions = {},
): Promise<MigrationRunResult> {
  const db = requireDb(options.db ?? mongoose.connection.db);
  const all = options.migrations ?? defaultMigrations;
  const lockTtlMs = options.lockTtlMs ?? DEFAULT_LOCK_TTL_MS;
  const waitMs = options.waitMs ?? DEFAULT_WAIT_MS;
  const deadline = Date.now() + waitMs;

  const initiallyApplied = await listAppliedIds(db);
  const skipped = all
    .filter((migration) => initiallyApplied.has(migration.id))
    .map((migration) => migration.id);

  if (pendingMigrations(all, initiallyApplied).length === 0) {
    return { applied: [], skipped };
  }

  const applied: string[] = [];

  while (Date.now() < deadline) {
    const appliedIds = await listAppliedIds(db);
    const pending = pendingMigrations(all, appliedIds);
    if (pending.length === 0) {
      return { applied, skipped };
    }

    const lock = await acquireLock(db, lockTtlMs);
    if (!lock) {
      await sleep(POLL_MS);
      continue;
    }

    try {
      const underLockApplied = await listAppliedIds(db);
      const stillPending = pendingMigrations(all, underLockApplied);

      for (const migration of stillPending) {
        console.log(
          `[migrate] applying ${migration.id} — ${migration.description}`,
        );
        await migration.up({ db, mongoose });
        await recordApplied(db, migration);
        applied.push(migration.id);
        console.log(`[migrate] applied ${migration.id}`);
      }

      return { applied, skipped };
    } finally {
      await lock.release();
    }
  }

  throw new Error(
    `Timed out after ${waitMs}ms waiting for migration lock / pending migrations`,
  );
}
