import type { Migration } from "./types.js";

/**
 * Ordered list of migrations. Append only — never reorder or remove applied ids.
 * See docs/migrations.md.
 */
export const migrations: Migration[] = [
  // Example:
  // import { migration as m001 } from "./20260728_001_example.js";
  // …then add m001 here.
];
