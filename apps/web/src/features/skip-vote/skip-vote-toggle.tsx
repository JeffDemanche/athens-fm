import { SkipForward } from "lucide-react";
import { useSkipVotes } from "@/features/skip-vote/use-skip-votes";
import { Button } from "@/primitives/button";
import { Text } from "@/primitives/text";
import { cn } from "@/lib/utils";

type SkipVoteToggleProps = {
  roomId: string;
  participantId: string;
  className?: string;
};

/** Participant toggle to vote for skipping the current track. */
export function SkipVoteToggle({
  roomId,
  participantId,
  className,
}: SkipVoteToggleProps) {
  const { state, toggleSkipVote } = useSkipVotes(roomId, participantId);
  const canVote = Boolean(state?.queueItemId);
  const voted = state?.viewerHasVoted ?? false;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/90 px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <Text
          as="p"
          size="sm"
          className="font-medium tracking-[0.16em] uppercase"
        >
          Skip current
        </Text>
        <Text as="p" size="sm" tone="muted" className="mt-0.5">
          {canVote
            ? voted
              ? "You're voting to skip — tap again to cancel"
              : "Vote to skip what's playing now"
            : "Waiting for a track to start"}
        </Text>
      </div>
      <Button
        type="button"
        size="lg"
        variant={voted ? "default" : "outline"}
        disabled={!canVote}
        aria-pressed={voted}
        aria-label={voted ? "Cancel skip vote" : "Vote to skip"}
        onClick={() => {
          void toggleSkipVote();
        }}
      >
        <SkipForward />
        {voted ? "Skipping" : "Skip"}
      </Button>
    </div>
  );
}
