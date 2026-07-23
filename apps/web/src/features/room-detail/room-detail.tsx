import type { ReactNode } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_ROOM, type RoomFields } from "@/graphql/rooms";
import { RoomHeader } from "@/composites/room-header";
import { RoomQueryState } from "@/composites/room-query-state";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";

type GetRoomResult = {
  room: RoomFields | null;
};

type GetRoomVars = {
  id: string;
};

type RoomDetailProps = {
  roomId: string;
  roleLabel: string;
  children?: ReactNode | ((room: RoomFields) => ReactNode);
};

export function RoomDetail({ roomId, roleLabel, children }: RoomDetailProps) {
  const { data, loading, error } = useQuery<GetRoomResult, GetRoomVars>(
    GET_ROOM,
    {
      variables: { id: roomId },
    },
  );

  if (loading || error || !data?.room) {
    return (
      <RoomQueryState
        loading={loading}
        errorMessage={error?.message}
        missing={!loading && !error && !data?.room}
      />
    );
  }

  const room = data.room;

  return (
    <Stack gap="lg">
      <RoomHeader room={room} roleLabel={roleLabel} />
      {typeof children === "function" ? children(room) : children}
      <Text size="sm" tone="muted">
        Updated {new Date(room.updatedAt).toLocaleString()}
      </Text>
    </Stack>
  );
}
