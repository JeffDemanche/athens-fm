import { cn } from "@/lib/utils";
import { Text } from "@/primitives/text";

type ActiveParticipantsCountProps = {
  count: number;
  className?: string;
};

/** Host desk panel for listeners currently in the active (TTL) set. */
export function ActiveParticipantsCount({
  count,
  className,
}: ActiveParticipantsCountProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border/80 bg-secondary/60 px-3 py-1.5 text-right",
        className,
      )}
      aria-live="polite"
      aria-label={`${count} active participants`}
    >
      <Text
        as="p"
        size="sm"
        tone="muted"
        className="font-medium tracking-[0.16em] uppercase"
      >
        Active
      </Text>
      <Text
        as="p"
        className="font-mono text-2xl font-semibold tracking-tight tabular-nums"
      >
        {count}
      </Text>
    </div>
  );
}
