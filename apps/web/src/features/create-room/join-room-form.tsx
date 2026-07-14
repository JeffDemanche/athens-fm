import { useMutation } from "@apollo/client/react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { JOIN_ROOM } from "@/graphql/participants";
import type { ParticipantFields, RoomFields } from "@/graphql/rooms";
import {
  getActiveMembership,
  isInAnotherRoom,
  setActiveMembership,
} from "@/lib/membership";
import { Button } from "@/primitives/button";
import { Input } from "@/primitives/input";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";

type JoinRoomResult = {
  joinRoom: ParticipantFields & {
    room: Pick<RoomFields, "id" | "shortId" | "name">;
  };
};

type JoinRoomVars = {
  roomId: string;
  name: string;
};

type JoinRoomFormProps = {
  disabled?: boolean;
};

export function JoinRoomForm({ disabled = false }: JoinRoomFormProps) {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [joinRoom, { loading, error }] = useMutation<
    JoinRoomResult,
    JoinRoomVars
  >(JOIN_ROOM);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const code = roomCode.trim().toUpperCase();
    if (code.length !== 5 || !displayName.trim()) {
      return;
    }

    const existing = getActiveMembership();
    if (existing && !isInAnotherRoom(existing, code)) {
      void navigate(
        existing.role === "HOST"
          ? `/rooms/${existing.roomShortId}/host`
          : `/rooms/${existing.roomShortId}`,
      );
      return;
    }

    if (isInAnotherRoom(existing, code)) {
      setLocalError(
        `You're already in room ${existing?.roomShortId}. Leave it before joining another.`,
      );
      return;
    }

    try {
      const result = await joinRoom({
        variables: { roomId: code, name: displayName },
      });
      const participant = result.data?.joinRoom;
      if (!participant?.room) {
        return;
      }

      setActiveMembership({
        participantId: participant.id,
        roomId: participant.room.id,
        roomShortId: participant.room.shortId,
        role: participant.role,
        participantName: participant.name,
      });
      void navigate(`/rooms/${participant.room.shortId}`);
    } catch (joinError) {
      setLocalError(
        joinError instanceof Error ? joinError.message : "Unable to join room",
      );
    }
  }

  const blocked = disabled || Boolean(getActiveMembership());
  const canSubmit = roomCode.trim().length === 5 && Boolean(displayName.trim());

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="md">
        <Stack gap="sm">
          <Text as="label" size="sm" tone="muted" htmlFor="join-room-code">
            Join as participant
          </Text>
          <Input
            id="join-room-code"
            name="roomCode"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="5-character code"
            required
            maxLength={5}
            autoComplete="off"
            inputMode="text"
            spellCheck={false}
            className="font-mono tracking-[0.2em] uppercase"
            disabled={blocked || loading}
          />
          <Input
            id="join-display-name"
            name="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your display name"
            required
            maxLength={40}
            autoComplete="nickname"
            disabled={blocked || loading}
            aria-label="Your display name"
          />
        </Stack>
        <Button
          type="submit"
          variant="secondary"
          disabled={blocked || loading || !canSubmit}
        >
          {loading ? "Joining…" : "Join room"}
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
