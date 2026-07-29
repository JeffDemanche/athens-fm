# MongoDB migrations

Forward-only data migrations so existing rooms keep working across Typegoose model changes.

## When required

Add a migration whenever an entity / collection change would break documents already in Mongo:

- Rename or remove a persisted field
- Change a field’s type or meaning
- Add a **required** field without a Mongoose/Typegoose default that covers old docs
- Change enums, indexes that need data backfills, or collection shape

Pure additive optional fields with safe defaults usually need **no** migration.

## How to add one

1. Create `apps/api/src/migrations/YYYYMMDD_NNN_snake_description.ts` exporting a `Migration`:

```ts
import type { Migration } from "./types.js";

export const migration: Migration = {
  id: "20260728_001_backfill_queue_score",
  description: "Set score=0 on queue_items missing score",
  up: async ({ db }) => {
    await db.collection("queue_items").updateMany(
      { score: { $exists: false } },
      { $set: { score: 0 } },
    );
  },
};
```

2. **Append** it to `apps/api/src/migrations/registry.ts` (never reorder / remove applied ids).
3. Add a focused Jest test under `apps/api/src/__tests__/` that:
   - Inserts **old-shape** documents with the native collection API
   - Calls `runPendingMigrations({ migrations: [migration] })`
   - Asserts the **new shape** (and that a second run is a no-op)
4. Prefer **idempotent** `up` bodies (`$exists` / filtered updates).

Id format: `YYYYMMDD_NNN_snake_description`.

## Runtime

- **Vercel Production deploy (primary)** — `vercel.json` `buildCommand` runs `npm run vercel-build` (`web` build, then `db:migrate`). A failed migration fails the build, so the new deployment does not go live.
- **Vercel Preview** — migrations are **skipped** when `VERCEL_ENV=preview` (build + boot). Preview apps talk to whatever `MONGODB_URI` is configured for Preview without mutating schema via this runner.
- **On API boot (safety net)** — `createHttpServer()` runs `runPendingMigrations()` after Mongo connects (local Docker, production instances).
- **Manual** — `npm run db:migrate` (requires `MONGODB_URI`; still skipped if `VERCEL_ENV=preview` or `SKIP_DB_MIGRATIONS=1`).
- Also skip with `SKIP_DB_MIGRATIONS=1` (emergency only).
- Applied ids live in Mongo collection `_migrations`.
- A short-lived lock in `_migration_locks` prevents concurrent double-apply across instances / build vs boot.

### Vercel notes

- Production build env must include `MONGODB_URI`.
- Atlas must allow connections from Vercel’s build network (often `0.0.0.0/0` or Atlas’s broader allowlist).
- Keep migrations short; on Production the build aborts if migrate exits non-zero.

## Do not

- Rely on dropping / resetting production data.
- Edit an already-shipped migration’s `up` — ship a new migration instead.
- Put GraphQL or service-layer logic inside migrations — use the native `db` handle.
