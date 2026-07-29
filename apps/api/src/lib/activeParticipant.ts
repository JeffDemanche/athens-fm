/** Guests idle longer than this are excluded from skip quorum. */
export const ACTIVE_PARTICIPANT_TTL_MS = 20 * 60 * 1000;

export function activeSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - ACTIVE_PARTICIPANT_TTL_MS);
}
