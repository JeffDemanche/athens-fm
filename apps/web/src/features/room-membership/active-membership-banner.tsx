import { Link } from "react-router-dom";
import { useLeaveRoom } from "@/features/room-membership/use-leave-room";
import type { ActiveMembership } from "@/lib/membership";
import { Button } from "@/primitives/button";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";

type ActiveMembershipBannerProps = {
  membership: ActiveMembership;
  onLeft?: () => void;
};

export function ActiveMembershipBanner({
  membership,
  onLeft,
}: ActiveMembershipBannerProps) {
  const { leaveRoom, loading } = useLeaveRoom();
  const roomPath =
    membership.role === "HOST"
      ? `/rooms/${membership.roomShortId}/host`
      : `/rooms/${membership.roomShortId}`;

  async function onLeave() {
    await leaveRoom();
    onLeft?.();
  }

  return (
    <Stack
      gap="md"
      className="rounded-lg border border-border/80 bg-secondary/40 p-4"
    >
      <Stack gap="sm">
        <Text
          as="p"
          size="sm"
          tone="muted"
          className="font-medium tracking-[0.16em] uppercase"
        >
          Already in a room
        </Text>
        <Text as="p">
          This browser is in{" "}
          <span className="font-mono font-semibold tracking-[0.2em]">
            {membership.roomShortId}
          </span>
          . Leave before creating or joining another.
        </Text>
      </Stack>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to={roomPath}>Return to room</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => {
            void onLeave();
          }}
        >
          {loading ? "Leaving…" : "Leave room"}
        </Button>
      </div>
    </Stack>
  );
}
