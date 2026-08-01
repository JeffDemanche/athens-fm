import type { Migration } from "./types.js";
import { migration as m20260801_001 } from "./20260801_001_backfill_queue_item_finished.js";

/**
 * Ordered list of migrations. Append only — never reorder or remove applied ids.
 * See docs/migrations.md.
 */
export const migrations: Migration[] = [m20260801_001];
