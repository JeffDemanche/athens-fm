import { useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { LEAVE_ROOM } from "@/graphql/participants";
import {
  clearActiveMembership,
  getActiveMembership,
} from "@/lib/membership";

type LeaveRoomResult = {
  leaveRoom: boolean;
};

type LeaveRoomVars = {
  participantId: string;
};

export function useLeaveRoom() {
  const navigate = useNavigate();
  const [leaveRoomMutation, { loading, error }] = useMutation<
    LeaveRoomResult,
    LeaveRoomVars
  >(LEAVE_ROOM);

  async function leaveRoom(options?: { redirectTo?: string }) {
    const membership = getActiveMembership();
    if (membership) {
      try {
        await leaveRoomMutation({
          variables: { participantId: membership.participantId },
        });
      } catch {
        // Clear local membership even if the server record is already gone.
      }
      clearActiveMembership();
    }

    void navigate(options?.redirectTo ?? "/");
  }

  return { leaveRoom, loading, error };
}
