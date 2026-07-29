/** Guests idle longer than this are excluded from skip quorum. */
export const ACTIVE_PARTICIPANT_TTL_MS = 20 * 60 * 1000;

/**
 * How often the inactivity sweeper looks for guests who just aged out of the
 * active set and republishes skipVoteStateUpdated for their rooms.
 */
export const ACTIVE_SWEEP_INTERVAL_MS = 60_000;

export function activeSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - ACTIVE_PARTICIPANT_TTL_MS);
}

/**
 * Guests whose lastActiveAt falls in [expiredAfter, expiredBefore) crossed
 * into inactive during that window. expiredBefore is typically activeSince().
 */
export function recentlyExpiredWindow(
  now: Date = new Date(),
  lookbackMs: number = ACTIVE_SWEEP_INTERVAL_MS * 2,
): { expiredAfter: Date; expiredBefore: Date } {
  const expiredBefore = activeSince(now);
  const expiredAfter = new Date(expiredBefore.getTime() - lookbackMs);
  return { expiredAfter, expiredBefore };
}
