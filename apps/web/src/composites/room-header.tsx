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
      <div className="rounded-md border border-border/80 bg-secondary/60 px-3 py-2">
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
          className="font-mono text-3xl font-semibold tracking-[0.28em]"
        >
          {room.shortId}
        </Text>
      </div>
    </Stack>
  );
}
