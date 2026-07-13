import { BrandLockup, PageShell } from "@/composites/page-shell";
import { CreateRoomForm } from "@/features/create-room/create-room-form";
import { JoinRoomForm } from "@/features/create-room/join-room-form";
import { Stack } from "@/primitives/stack";

export function LandingView() {
  return (
    <PageShell narrow className="justify-center gap-10">
      <BrandLockup
        title="A democratic DJ"
        description="Create a room to host the queue, or join with a room ID from your phone."
      />

      <Stack gap="lg" className="max-w-md">
        <CreateRoomForm />
        <div className="h-px w-full bg-border" />
        <JoinRoomForm />
      </Stack>
    </PageShell>
  );
}
