import { useMutation } from "@apollo/client/react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CREATE_ROOM, type RoomFields } from "@/graphql/rooms";
import { Button } from "@/primitives/button";
import { Input } from "@/primitives/input";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";

type CreateRoomResult = {
  createRoom: RoomFields;
};

type CreateRoomVars = {
  name: string;
};

export function CreateRoomForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [createRoom, { loading, error }] = useMutation<
    CreateRoomResult,
    CreateRoomVars
  >(CREATE_ROOM);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await createRoom({ variables: { name } });
    const roomId = result.data?.createRoom.id;
    if (roomId) {
      void navigate(`/rooms/${roomId}/host`);
    }
  }

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
          />
        </Stack>
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? "Creating…" : "Create room"}
        </Button>
        {error ? (
          <Text size="sm" tone="destructive">
            {error.message}
          </Text>
        ) : null}
      </Stack>
    </form>
  );
}
