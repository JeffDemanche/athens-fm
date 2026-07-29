import { useMutation } from "@apollo/client/react";
import { useEffect, useRef } from "react";
import { TOUCH_PARTICIPANT_ACTIVITY } from "@/graphql/participants";

/** Min gap between activity touches from the participant view. */
const ACTIVITY_TOUCH_THROTTLE_MS = 60_000;

type TouchResult = {
  touchParticipantActivity: {
    id: string;
    lastActiveAt: string | null;
  };
};

/**
 * Keeps the guest in the active set: touches on mount and on any pointer/key
 * interaction with the participant view (throttled).
 */
export function useParticipantActivity(participantId: string | null) {
  const [touch] = useMutation<TouchResult, { participantId: string }>(
    TOUCH_PARTICIPANT_ACTIVITY,
  );
  const lastTouchRef = useRef(0);
  const participantIdRef = useRef(participantId);
  participantIdRef.current = participantId;

  useEffect(() => {
    if (!participantId) {
      return;
    }

    const sendTouch = (force = false) => {
      const id = participantIdRef.current;
      if (!id) {
        return;
      }
      const now = Date.now();
      if (!force && now - lastTouchRef.current < ACTIVITY_TOUCH_THROTTLE_MS) {
        return;
      }
      lastTouchRef.current = now;
      void touch({ variables: { participantId: id } });
    };

    sendTouch(true);

    const onInteract = () => {
      sendTouch(false);
    };

    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);
    window.addEventListener("scroll", onInteract, { passive: true });

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        sendTouch(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("scroll", onInteract);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [participantId, touch]);
}
