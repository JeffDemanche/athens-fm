/**
 * Per-room tunable settings and quorum math.
 *
 * Defaults preserve the historical hard-coded thresholds:
 * - skip: floor(n/2)+1 ≈ ceil(n * 51 / 100)
 * - volume: floor(n/3)+1 ≈ ceil(n * 34 / 100)
 */

export const DEFAULT_SKIP_QUORUM_PERCENT = 51;
export const DEFAULT_VOLUME_QUORUM_PERCENT = 34;

export type RoomSettings = {
  skipQuorumPercent: number;
  volumeQuorumPercent: number;
  /** Null = no duration limit. */
  maxSubmissionDurationMinutes: number | null;
  /** Null = no simultaneous-submission limit. */
  maxSimultaneousSubmissions: number | null;
};

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  skipQuorumPercent: DEFAULT_SKIP_QUORUM_PERCENT,
  volumeQuorumPercent: DEFAULT_VOLUME_QUORUM_PERCENT,
  maxSubmissionDurationMinutes: null,
  maxSimultaneousSubmissions: null,
};

/**
 * Votes needed from `participantCount` active guests given a percent quorum.
 * Returns 0 when there are no participants or percent is non-positive.
 */
export function quorumThreshold(
  participantCount: number,
  percent: number,
): number {
  if (participantCount <= 0 || percent <= 0) {
    return 0;
  }
  return Math.ceil((participantCount * percent) / 100);
}

export function clampQuorumPercent(value: number): number {
  return Math.min(100, Math.max(1, Math.round(value)));
}
