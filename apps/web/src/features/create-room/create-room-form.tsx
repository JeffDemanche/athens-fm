import { useMutation } from "@apollo/client/react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  CREATE_ROOM,
  type ParticipantFields,
  type RoomFields,
} from "@/graphql/rooms";
import {
  getActiveMembership,
  setActiveMembership,
} from "@/lib/membership";
import { Button } from "@/primitives/button";
import { Input } from "@/primitives/input";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";

type CreateRoomResult = {
  createRoom: {
    room: RoomFields;
    participant: ParticipantFields;
  };
};

type CreateRoomVars = {
  name: string;
};

type CreateRoomFormProps = {
  disabled?: boolean;
};

export function CreateRoomForm({ disabled = false }: CreateRoomFormProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [createRoom, { loading, error }] = useMutation<
    CreateRoomResult,
    CreateRoomVars
  >(CREATE_ROOM);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const existing = getActiveMembership();
    if (existing) {
      setLocalError(
        `You're already in room ${existing.roomShortId}. Leave it before creating another.`,
      );
      return;
    }

    const result = await createRoom({ variables: { name } });
    const payload = result.data?.createRoom;
    if (!payload) {
      return;
    }

    setActiveMembership({
      participantId: payload.participant.id,
      roomId: payload.room.id,
      roomShortId: payload.room.shortId,
      role: payload.participant.role,
      participantName: null,
    });
    void navigate(`/rooms/${payload.room.shortId}/host`);
  }

  const blocked = disabled || Boolean(getActiveMembership());

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="md">
        <Stack gap="sm">
          <Text as="label" size="sm" tone="muted" htmlFor="room-name">
            Start a room
          </Text>
          <Input
            id="room-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Room name"
            required
            maxLength={120}
            autoComplete="off"
            disabled={blocked || loading}
          />
        </Stack>
        <Button type="submit" disabled={blocked || loading || !name.trim()}>
          {loading ? "Creating…" : "Create room"}
        </Button>
        {localError || error ? (
          <Text size="sm" tone="destructive">
            {localError ?? error?.message}
          </Text>
        ) : null}
      </Stack>
    </form>
  );
}
