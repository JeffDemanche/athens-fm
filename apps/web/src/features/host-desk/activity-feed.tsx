import { useEffect, useRef } from "react";
import { useQuery, useSubscription } from "@apollo/client/react";
import { DeskPanel } from "@/composites/desk-panel";
import {
  GET_ROOM_EVENTS,
  ROOM_EVENT_ADDED,
  type RoomEventFields,
} from "@/graphql/room-events";
import { Text } from "@/primitives/text";
import { cn } from "@/lib/utils";

type GetRoomEventsResult = {
  roomEvents: RoomEventFields[];
};

type RoomEventAddedResult = {
  roomEventAdded: RoomEventFields;
};

type RoomIdVars = {
  roomId: string;
};

type ActivityFeedProps = {
  roomId: string;
  className?: string;
};

function roleLabel(role: RoomEventFields["participantRole"]): string {
  return role === "HOST" ? "Host" : "Guest";
}

function eventCopy(event: RoomEventFields): string {
  const actor = roleLabel(event.participantRole);
  if (event.type === "JOINED") {
    return `${actor} joined the room`;
  }
  return `${actor} left the room`;
}

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityFeed({ roomId, className }: ActivityFeedProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const { data, loading } = useQuery<GetRoomEventsResult, RoomIdVars>(
    GET_ROOM_EVENTS,
    {
      variables: { roomId },
      skip: !roomId,
    },
  );

  useSubscription<RoomEventAddedResult, RoomIdVars>(ROOM_EVENT_ADDED, {
    variables: { roomId },
    skip: !roomId,
    onData: ({ client, data: subscriptionData }) => {
      const event = subscriptionData.data?.roomEventAdded;
      if (!event) {
        return;
      }

      client.cache.updateQuery<GetRoomEventsResult, RoomIdVars>(
        { query: GET_ROOM_EVENTS, variables: { roomId } },
        (existing) => {
          const current = existing?.roomEvents ?? [];
          if (current.some((item) => item.id === event.id)) {
            return existing ?? { roomEvents: current };
          }
          return { roomEvents: [...current, event] };
        },
      );
    },
  });

  const events = data?.roomEvents ?? [];

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    list.scrollTop = list.scrollHeight;
  }, [events.length]);

  return (
    <DeskPanel
      title="Activity"
      description="Live joins and leaves in this room"
      className={cn(className)}
    >
      {loading && events.length === 0 ? (
        <div className="flex h-full items-center justify-center px-4 py-8">
          <Text tone="muted" size="sm" className="text-center">
            Loading activity…
          </Text>
        </div>
      ) : events.length === 0 ? (
        <div className="flex h-full items-center justify-center px-4 py-8">
          <Text tone="muted" size="sm" className="text-center">
            Room events will show up here as people join and leave.
          </Text>
        </div>
      ) : (
        <ul
          ref={listRef}
          className="h-full space-y-0 overflow-y-auto px-2 py-2"
        >
          {events.map((event) => (
            <li
              key={event.id}
              className="border-b border-border/50 px-2 py-3 last:border-b-0"
            >
              <Text as="p" size="sm">
                {eventCopy(event)}
              </Text>
              <Text as="p" size="sm" tone="muted" className="mt-0.5 text-xs">
                {formatEventTime(event.createdAt)}
              </Text>
            </li>
          ))}
        </ul>
      )}
    </DeskPanel>
  );
}
