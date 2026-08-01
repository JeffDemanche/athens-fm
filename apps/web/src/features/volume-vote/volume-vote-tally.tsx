import { cn } from "@/lib/utils";
import { Text } from "@/primitives/text";

type VolumeVoteTallyProps = {
  netCount: number;
  /** Absolute votes needed for quorum in either direction. */
  threshold: number;
  volumePercent: number;
  passed?: boolean;
  className?: string;
};

/**
 * Host desk companion to SkipVoteTally: bipolar net meter with quorum
 * markers at ±threshold, plus current player volume %.
 */
export function VolumeVoteTally({
  netCount,
  threshold,
  volumePercent,
  passed = false,
  className,
}: VolumeVoteTallyProps) {
  const meterMax = Math.max(threshold, Math.abs(netCount), 1);
  // Map net from [-meterMax, +meterMax] → 0%–100% of the track.
  const indicatorPercent = ((netCount + meterMax) / (2 * meterMax)) * 100;
  const quorumUpPercent = ((threshold + meterMax) / (2 * meterMax)) * 100;
  const quorumDownPercent = ((-threshold + meterMax) / (2 * meterMax)) * 100;
  const showQuorumMarks = threshold > 0;

  return (
    <div
      className={cn(
        "min-w-[10.5rem] rounded-md border px-3 py-1.5 transition-colors",
        passed
          ? "border-primary bg-primary/15"
          : "border-border/80 bg-secondary/60",
        className,
      )}
      aria-live="polite"
      aria-label={`Volume vote net ${netCount}, quorum ${threshold}, volume ${volumePercent} percent`}
    >
      <div className="flex items-start justify-between gap-3">
        <Text
          as="p"
          size="sm"
          tone="muted"
          className="font-medium tracking-[0.16em] uppercase"
        >
          Volume votes
        </Text>
        <Text
          as="p"
          className={cn(
            "font-mono text-lg font-semibold tracking-tight tabular-nums",
            passed && "text-primary",
          )}
        >
          {volumePercent}
          <span className="text-sm font-medium text-muted-foreground">%</span>
        </Text>
      </div>

      <div className="mt-2">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          {showQuorumMarks ? (
            <>
              <span
                className="absolute top-0 bottom-0 w-px bg-foreground/35"
                style={{ left: `${quorumDownPercent}%` }}
                aria-hidden
              />
              <span
                className="absolute top-0 bottom-0 w-px bg-foreground/35"
                style={{ left: `${quorumUpPercent}%` }}
                aria-hidden
              />
            </>
          ) : null}
          <span
            className="absolute top-0 bottom-0 w-px bg-foreground/20"
            style={{ left: "50%" }}
            aria-hidden
          />
          <span
            className={cn(
              "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background shadow-sm",
              passed ? "bg-primary" : "bg-foreground",
            )}
            style={{ left: `${indicatorPercent}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[0.65rem] tabular-nums text-muted-foreground">
          <span>−{threshold || 0}</span>
          <span
            className={cn(
              "font-semibold",
              passed ? "text-primary" : "text-foreground",
            )}
          >
            {netCount > 0 ? `+${netCount}` : netCount}
          </span>
          <span>+{threshold || 0}</span>
        </div>
      </div>
    </div>
  );
}
