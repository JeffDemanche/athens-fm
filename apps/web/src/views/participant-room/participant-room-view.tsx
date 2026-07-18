import { useMutation, useQuery } from "@apollo/client/react";
import { useState, type FormEvent } from "react";
import { Navigate, useParams } from "react-router-dom";
import { PageShell } from "@/composites/page-shell";
import { RoomQueryState } from "@/composites/room-query-state";
import { AddQueueItemForm } from "@/features/queue/add-queue-item-form";
import { ParticipantQueue } from "@/features/queue/participant-queue";
import { RoomDetail } from "@/features/room-detail/room-detail";
import { useLeaveRoom } from "@/features/room-membership/use-leave-room";
import { JOIN_ROOM } from "@/graphql/participants";
import { GET_ROOM, type ParticipantFields, type RoomFields } from "@/graphql/rooms";
import {
  getActiveMembership,
  isInAnotherRoom,
  setActiveMembership,
} from "@/lib/membership";
import { Button } from "@/primitives/button";
import { Input } from "@/primitives/input";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";

type GetRoomResult = {
  room: RoomFields | null;
};

type GetRoomVars = {
  id: string;
};

type JoinRoomResult = {
  joinRoom: ParticipantFields & {
    room: Pick<RoomFields, "id" | "shortId" | "name">;
  };
};

type JoinRoomVars = {
  roomId: string;
  name: string;
};

export function ParticipantRoomView() {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const code = roomId.trim().toUpperCase();
  const existing = getActiveMembership();
  const alreadyInThisRoom = Boolean(
    existing && !isInAnotherRoom(existing, code),
  );
  const blockedByOtherRoom = isInAnotherRoom(existing, code);
  const hostShouldUseDesk =
    alreadyInThisRoom && existing?.role === "HOST";

  const { leaveRoom, loading: leaving } = useLeaveRoom();
  const [joinRoom, { loading: joining }] = useMutation<
    JoinRoomResult,
    JoinRoomVars
  >(JOIN_ROOM);
  const [displayName, setDisplayName] = useState("");
  const [ready, setReady] = useState(
    alreadyInThisRoom && existing?.role === "GUEST",
  );
  const [joinError, setJoinError] = useState<string | null>(() => {
    if (blockedByOtherRoom) {
      return `This browser is already in room ${existing?.roomShortId}. Leave that room before joining another.`;
    }
    return null;
  });

  const { data, loading, error } = useQuery<GetRoomResult, GetRoomVars>(
    GET_ROOM,
    {
      variables: { id: code },
      skip: !code || ready || blockedByOtherRoom || hostShouldUseDesk,
    },
  );

  if (hostShouldUseDesk && existing) {
    return <Navigate to={`/rooms/${existing.roomShortId}/host`} replace />;
  }

  async function onJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinError(null);

    if (!displayName.trim()) {
      return;
    }

    try {
      const result = await joinRoom({
        variables: { roomId: code, name: displayName },
      });
      const participant = result.data?.joinRoom;
      if (!participant?.room) {
        throw new Error("Unable to join room");
      }

      setActiveMembership({
        participantId: participant.id,
        roomId: participant.room.id,
        roomShortId: participant.room.shortId,
        role: participant.role,
        participantName: participant.name,
      });
      setReady(true);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Unable to join room");
    }
  }

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

      {blockedByOtherRoom ? (
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
      ) : ready && existing ? (
        <RoomDetail roomId={roomId} roleLabel="Listening">
          <Stack gap="md">
            <AddQueueItemForm
              participantId={existing.participantId}
              roomId={existing.roomId}
            />
            <ParticipantQueue roomId={existing.roomId} />
            <Button className="h-12 w-full text-base" disabled>
              Vote (coming soon)
            </Button>
          </Stack>
        </RoomDetail>
      ) : loading || error || !data?.room ? (
        <RoomQueryState
          loading={loading}
          errorMessage={error?.message}
          missing={!loading && !error && !data?.room}
        />
      ) : (
        <Stack gap="md">
          <div>
            <Text
              as="p"
              size="sm"
              tone="muted"
              className="font-medium tracking-[0.16em] uppercase"
            >
              Join room
            </Text>
            <Text as="h1" size="xl" className="mt-1">
              {data.room.name}
            </Text>
            <Text
              as="p"
              className="mt-1 font-mono text-lg tracking-[0.2em] text-muted-foreground"
            >
              {data.room.shortId}
            </Text>
          </div>
          <form onSubmit={onJoin}>
            <Stack gap="md">
              <Input
                id="participant-display-name"
                name="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your display name"
                required
                maxLength={40}
                autoComplete="nickname"
                disabled={joining}
                aria-label="Your display name"
              />
              {joinError ? (
                <Text size="sm" tone="destructive">
                  {joinError}
                </Text>
              ) : null}
              <Button
                type="submit"
                className="h-12 w-full text-base"
                disabled={joining || !displayName.trim()}
              >
                {joining ? "Joining…" : "Join room"}
              </Button>
            </Stack>
          </form>
        </Stack>
      )}
    </PageShell>
  );
}
