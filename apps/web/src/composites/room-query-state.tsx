import { Link } from "react-router-dom";
import { Spinner } from "@/primitives/spinner";
import { Stack } from "@/primitives/stack";
import { Text } from "@/primitives/text";
import { Button } from "@/primitives/button";

type RoomQueryStateProps = {
  loading: boolean;
  errorMessage?: string | null;
  missing?: boolean;
};

export function RoomQueryState({
  loading,
  errorMessage,
  missing,
}: RoomQueryStateProps) {
  if (loading) {
    return (
      <Stack gap="md" className="items-start">
        <Spinner />
        <Text tone="muted">Loading room…</Text>
      </Stack>
    );
  }

  if (errorMessage) {
    return (
      <Stack gap="md">
        <Text tone="destructive">{errorMessage}</Text>
        <Button asChild variant="outline">
          <Link to="/">Back to home</Link>
        </Button>
      </Stack>
    );
  }

  if (missing) {
    return (
      <Stack gap="md">
        <Text tone="muted">This room could not be found.</Text>
        <Button asChild variant="outline">
          <Link to="/">Back to home</Link>
        </Button>
      </Stack>
    );
  }

  return null;
}
