import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";
import type { RoomFields } from "@/graphql/rooms";

type RoomHeaderProps = {
  room: RoomFields;
  roleLabel: string;
};

export function RoomHeader({ room, roleLabel }: RoomHeaderProps) {
  return (
    <Stack gap="sm">
      <Text
        as="p"
        size="sm"
        tone="muted"
        className="font-medium tracking-[0.18em] uppercase"
      >
        {roleLabel}
      </Text>
      <Text as="h1" size="xl" className="break-words sm:text-3xl">
        {room.name}
      </Text>
      <Text as="p" size="sm" tone="muted" className="font-mono">
        {room.id}
      </Text>
    </Stack>
  );
}
