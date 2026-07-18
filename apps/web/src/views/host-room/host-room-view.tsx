import { useParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { RoomQueryState } from "@/composites/room-query-state";
import { ActivityFeed } from "@/features/host-desk/activity-feed";
import { PlaylistPanel } from "@/features/host-desk/playlist-panel";
import { VideoViewer } from "@/features/host-desk/video-viewer";
import { useRoomQueue } from "@/features/queue/use-room-queue";
import { useLeaveRoom } from "@/features/room-membership/use-leave-room";
import { GET_ROOM, type RoomFields } from "@/graphql/rooms";
import { Button } from "@/primitives/button";
import { Text } from "@/primitives/text";

type GetRoomResult = {
  room: RoomFields | null;
};

type GetRoomVars = {
  id: string;
};

export function HostRoomView() {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const { leaveRoom, loading: leaving } = useLeaveRoom();
  const { data, loading, error } = useQuery<GetRoomResult, GetRoomVars>(
    GET_ROOM,
    {
      variables: { id: roomId },
    },
  );

  const room = data?.room;
  const { items: queueItems } = useRoomQueue(room?.id ?? "");
  const nowPlaying = queueItems[0] ?? null;

  if (loading || error || !room) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 py-16">
        <RoomQueryState
          loading={loading}
          errorMessage={error?.message}
          missing={!loading && !error && !room}
        />
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col gap-3 overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_oklch(0.96_0.025_70)_0%,_var(--background)_50%)] p-3 sm:p-4">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/80 px-4 py-3">
        <div className="min-w-0">
          <Text
            as="p"
            size="sm"
            tone="muted"
            className="font-medium tracking-[0.18em] uppercase"
          >
            Athens FM · Host desk
          </Text>
          <Text as="h1" size="xl" className="truncate">
            {room.name}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-md border border-border/80 bg-secondary/60 px-3 py-1.5 text-right">
            <Text
              as="p"
              size="sm"
              tone="muted"
              className="font-medium tracking-[0.16em] uppercase"
            >
              Room code
            </Text>
            <Text
              as="p"
              className="font-mono text-2xl font-semibold tracking-[0.28em]"
            >
              {room.shortId}
            </Text>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={leaving}
            onClick={() => {
              void leaveRoom();
            }}
          >
            {leaving ? "Leaving…" : "End room"}
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <VideoViewer
          className="min-h-[14rem]"
          media={
            nowPlaying
              ? { type: nowPlaying.type, externalId: nowPlaying.externalId }
              : null
          }
          title={nowPlaying?.title ?? null}
        />
        <ActivityFeed roomId={room.id} className="min-h-[12rem]" />
      </div>

      <PlaylistPanel items={queueItems} />
    </main>
  );
}
