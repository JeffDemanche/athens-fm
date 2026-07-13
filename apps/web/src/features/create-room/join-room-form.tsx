import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/primitives/button";
import { Input } from "@/primitives/input";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";

export function JoinRoomForm() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = roomId.trim();
    if (!trimmed) return;
    void navigate(`/rooms/${trimmed}`);
  }

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="md">
        <Stack gap="sm">
          <Text as="label" size="sm" tone="muted" htmlFor="join-room-id">
            Join as participant
          </Text>
          <Input
            id="join-room-id"
            name="roomId"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            placeholder="Room ID"
            required
            autoComplete="off"
            inputMode="text"
          />
        </Stack>
        <Button type="submit" variant="secondary" disabled={!roomId.trim()}>
          Join room
        </Button>
      </Stack>
    </form>
  );
}
