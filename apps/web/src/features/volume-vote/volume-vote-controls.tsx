import { Volume2, VolumeX } from "lucide-react";
import { useVolumeVotes } from "@/features/volume-vote/use-volume-votes";
import type { VolumeVoteValue } from "@/graphql/volume-votes";
import { Button } from "@/primitives/button";
import { Text } from "@/primitives/text";
import { cn } from "@/lib/utils";

type VolumeVoteControlsProps = {
  roomId: string;
  participantId: string;
  className?: string;
};

const OPTIONS: Array<{
  value: VolumeVoteValue;
  label: string;
  ariaLabel: string;
  icon?: "down" | "up";
}> = [
  {
    value: "DOWN",
    label: "Turn down",
    ariaLabel: "Vote to turn volume down",
    icon: "down",
  },
  {
    value: "NONE",
    label: "No vote",
    ariaLabel: "Clear volume vote",
  },
  {
    value: "UP",
    label: "Turn up",
    ariaLabel: "Vote to turn volume up",
    icon: "up",
  },
];

/** Exclusive three-way volume vote: turn down, no vote, or turn up. */
export function VolumeVoteControls({
  roomId,
  participantId,
  className,
}: VolumeVoteControlsProps) {
  const { state, setVolumeVote } = useVolumeVotes(roomId, participantId);
  const canVote = Boolean(state?.queueItemId);
  const selected: VolumeVoteValue = state?.viewerVote ?? "NONE";

  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-card/90 px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <Text
          as="p"
          size="sm"
          className="font-medium tracking-[0.16em] uppercase"
        >
          Volume
        </Text>
        <Text as="p" size="sm" tone="muted" className="mt-0.5">
          {canVote
            ? "Vote to nudge the room volume up or down"
            : "Waiting for a track to start"}
        </Text>
      </div>

      <div
        role="radiogroup"
        aria-label="Volume vote"
        className="mt-3 grid grid-cols-3 gap-2"
      >
        {OPTIONS.map((option) => {
          const pressed = selected === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              size="lg"
              variant={pressed ? "default" : "outline"}
              disabled={!canVote}
              role="radio"
              aria-checked={pressed}
              aria-label={option.ariaLabel}
              className="flex-col gap-1 px-2 py-3 h-auto text-xs sm:text-sm"
              onClick={() => {
                if (pressed && option.value !== "NONE") {
                  return;
                }
                void setVolumeVote(option.value);
              }}
            >
              {option.icon === "down" ? (
                <VolumeX className="size-4" />
              ) : option.icon === "up" ? (
                <Volume2 className="size-4" />
              ) : null}
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
