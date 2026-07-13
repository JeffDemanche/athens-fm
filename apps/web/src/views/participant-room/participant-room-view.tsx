import { Link, useParams } from "react-router-dom";
import { PageShell } from "@/composites/page-shell";
import { RoomDetail } from "@/features/room-detail/room-detail";
import { Button } from "@/primitives/button";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";

export function ParticipantRoomView() {
  const { roomId = "" } = useParams<{ roomId: string }>();

  return (
    <PageShell
      narrow
      mobileSafe
      className="gap-6 bg-[radial-gradient(ellipse_at_top,_oklch(0.96_0.02_70)_0%,_var(--background)_55%)]"
    >
      <header className="sticky top-0 z-10 -mx-4 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/75">
        <div className="flex items-center justify-between gap-3">
          <Text
            as="p"
            size="sm"
            className="font-medium tracking-[0.18em] uppercase"
          >
            Athens FM
          </Text>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">Exit</Link>
          </Button>
        </div>
      </header>

      <RoomDetail roomId={roomId} roleLabel="Listening">
        <Stack
          gap="md"
          className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm"
        >
          <Text size="lg">You&apos;re in the room.</Text>
          <Text tone="muted" size="sm">
            Voting and queue controls will land here. This layout is tuned for
            one-handed use on mobile web.
          </Text>
          <Button className="h-12 w-full text-base" disabled>
            Vote (coming soon)
          </Button>
        </Stack>
      </RoomDetail>
    </PageShell>
  );
}
