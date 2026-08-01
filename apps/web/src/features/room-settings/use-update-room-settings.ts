import { useMutation } from "@apollo/client/react";
import {
  UPDATE_ROOM_SETTINGS,
  type RoomFields,
  type RoomSettingsInput,
} from "@/graphql/rooms";
import { getActiveMembership } from "@/lib/membership";

type UpdateRoomSettingsResult = {
  updateRoomSettings: Pick<
    RoomFields,
    | "id"
    | "skipQuorumPercent"
    | "volumeQuorumPercent"
    | "maxSubmissionDurationMinutes"
    | "maxSimultaneousSubmissions"
    | "updatedAt"
  >;
};

type UpdateRoomSettingsVars = {
  participantId: string;
  input: RoomSettingsInput;
};

export function useUpdateRoomSettings() {
  const [mutate, { loading, error }] = useMutation<
    UpdateRoomSettingsResult,
    UpdateRoomSettingsVars
  >(UPDATE_ROOM_SETTINGS);

  async function updateRoomSettings(input: RoomSettingsInput) {
    const membership = getActiveMembership();
    if (!membership || membership.role !== "HOST") {
      throw new Error("Only the host can update room settings");
    }

    const result = await mutate({
      variables: {
        participantId: membership.participantId,
        input,
      },
    });

    return result.data?.updateRoomSettings ?? null;
  }

  return {
    updateRoomSettings,
    loading,
    errorMessage: error?.message ?? null,
  };
}
