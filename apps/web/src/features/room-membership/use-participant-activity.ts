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
 *
 * Listeners and the mutation function are held in refs so this hook does not
 * re-bind or force-touch on unrelated re-renders.
 */
export function useParticipantActivity(participantId: string | null) {
  const [touch] = useMutation<TouchResult, { participantId: string }>(
    TOUCH_PARTICIPANT_ACTIVITY,
  );
  const touchRef = useRef(touch);
  touchRef.current = touch;
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
      void touchRef.current({ variables: { participantId: id } });
    };

    // Mount / participant change — establish activity once.
    sendTouch(true);

    const onInteract = () => {
      sendTouch(false);
    };

    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);
    window.addEventListener("scroll", onInteract, { passive: true });

    // Returning to the tab should refresh activity, but never bypass the
    // throttle — a forced touch here was republishing skip state on every
    // focus and could tear down the host player via cascading refetches.
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
  }, [participantId]);
}
