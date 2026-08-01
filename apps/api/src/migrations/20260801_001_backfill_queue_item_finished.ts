import type { Migration } from "./types.js";

/**
 * Early queue items were written before `finished` existed. Playlist and
 * simultaneous-submission queries used `finished: { $ne: true }`, which treated
 * those docs as still active forever. Mark them finished so they leave the
 * queue and stop counting toward submission caps.
 */
export const migration: Migration = {
  id: "20260801_001_backfill_queue_item_finished",
  description:
    "Set finished=true on queue_items missing the finished field (legacy soft-pop gap)",
  up: async ({ db }) => {
    await db.collection("queue_items").updateMany(
      { finished: { $exists: false } },
      { $set: { finished: true } },
    );
  },
};
