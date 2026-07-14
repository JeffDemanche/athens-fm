import { useMutation } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageShell } from "@/composites/page-shell";
import { RoomDetail } from "@/features/room-detail/room-detail";
import { useLeaveRoom } from "@/features/room-membership/use-leave-room";
import { JOIN_ROOM } from "@/graphql/participants";
import type { ParticipantFields, RoomFields } from "@/graphql/rooms";
import {
  getActiveMembership,
  isInAnotherRoom,
  setActiveMembership,
} from "@/lib/membership";
import { Button } from "@/primitives/button";
import { Spinner } from "@/primitives/spinner";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";

type JoinRoomResult = {
  joinRoom: ParticipantFields & {
    room: Pick<RoomFields, "id" | "shortId" | "name">;
  };
};

type JoinRoomVars = {
  roomId: string;
};

export function ParticipantRoomView() {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const { leaveRoom, loading: leaving } = useLeaveRoom();
  const [joinRoom] = useMutation<JoinRoomResult, JoinRoomVars>(JOIN_ROOM);
  const [ready, setReady] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureMembership() {
      const code = roomId.trim().toUpperCase();
      const existing = getActiveMembership();

      if (existing && !isInAnotherRoom(existing, code)) {
        if (!cancelled) {
          setReady(true);
        }
        return;
      }

      if (isInAnotherRoom(existing, code)) {
        if (!cancelled) {
          setJoinError(
            `This browser is already in room ${existing?.roomShortId}. Leave that room before joining another.`,
          );
        }
        return;
      }

      try {
        const result = await joinRoom({ variables: { roomId: code } });
        const participant = result.data?.joinRoom;
        if (!participant?.room) {
          throw new Error("Unable to join room");
        }

        // Strict Mode may remount before we finish; keep the first successful join.
        if (cancelled) {
          const latest = getActiveMembership();
          if (!latest) {
            setActiveMembership({
              participantId: participant.id,
              roomId: participant.room.id,
              roomShortId: participant.room.shortId,
              role: participant.role,
            });
          }
          return;
        }

        setActiveMembership({
          participantId: participant.id,
          roomId: participant.room.id,
          roomShortId: participant.room.shortId,
          role: participant.role,
        });
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          setJoinError(
            error instanceof Error ? error.message : "Unable to join room",
          );
        }
      }
    }

    void ensureMembership();

    return () => {
      cancelled = true;
    };
  }, [joinRoom, roomId]);

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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={leaving}
            onClick={() => {
              void leaveRoom();
            }}
          >
            {leaving ? "Leaving…" : "Leave"}
          </Button>
        </div>
      </header>

      {joinError ? (
        <Stack gap="md">
          <Text tone="destructive">{joinError}</Text>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void leaveRoom();
            }}
          >
            Back to home
          </Button>
        </Stack>
      ) : !ready ? (
        <div className="flex items-center gap-3 py-8">
          <Spinner />
          <Text tone="muted">Joining room…</Text>
        </div>
      ) : (
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
      )}
    </PageShell>
  );
}
