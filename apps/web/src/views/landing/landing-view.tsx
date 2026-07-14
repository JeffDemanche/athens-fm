import { useState } from "react";
import { BrandLockup, PageShell } from "@/composites/page-shell";
import { CreateRoomForm } from "@/features/create-room/create-room-form";
import { JoinRoomForm } from "@/features/create-room/join-room-form";
import { ActiveMembershipBanner } from "@/features/room-membership/active-membership-banner";
import { getActiveMembership } from "@/lib/membership";
import { Stack } from "@/primitives/stack";

export function LandingView() {
  const [membership, setMembership] = useState(() => getActiveMembership());
  const blocked = Boolean(membership);

  return (
    <PageShell narrow className="justify-center gap-10">
      <BrandLockup
        title="A democratic DJ"
        description="Create a room to host the queue, or join with a room code from your phone."
      />

      <Stack gap="lg" className="max-w-md">
        {membership ? (
          <ActiveMembershipBanner
            membership={membership}
            onLeft={() => setMembership(null)}
          />
        ) : null}
        <CreateRoomForm disabled={blocked} />
        <div className="h-px w-full bg-border" />
        <JoinRoomForm disabled={blocked} />
      </Stack>
    </PageShell>
  );
}
