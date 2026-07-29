import { cn } from "@/lib/utils";
import { Text } from "@/primitives/text";

type SkipVoteTallyProps = {
  voteCount: number;
  participantCount: number;
  passed?: boolean;
  className?: string;
};

/** Prominent skip-vote fraction for the Now Playing header. */
export function SkipVoteTally({
  voteCount,
  participantCount,
  passed = false,
  className,
}: SkipVoteTallyProps) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-1.5 text-right transition-colors",
        passed
          ? "border-primary bg-primary/15"
          : "border-border/80 bg-secondary/60",
        className,
      )}
      aria-live="polite"
      aria-label={`${voteCount} of ${participantCount} votes to skip`}
    >
      <Text
        as="p"
        size="sm"
        tone="muted"
        className="font-medium tracking-[0.16em] uppercase"
      >
        Skip votes
      </Text>
      <Text
        as="p"
        className={cn(
          "font-mono text-2xl font-semibold tracking-tight tabular-nums",
          passed && "text-primary",
        )}
      >
        {voteCount}
        <span className="text-lg font-medium text-muted-foreground">
          /{participantCount}
        </span>
      </Text>
    </div>
  );
}
