import { track } from "@vercel/analytics";

export const AnalyticsEvent = {
  RoomCreated: "Room Created",
  RoomJoined: "Room Joined",
  QueueVote: "Queue Vote",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

type EventProps = {
  [AnalyticsEvent.RoomCreated]: { roomShortId: string };
  [AnalyticsEvent.RoomJoined]: { roomShortId: string };
  [AnalyticsEvent.QueueVote]: {
    value: "UP" | "DOWN";
    cleared: boolean;
  };
};

/** Typed wrapper around Vercel Web Analytics `track()`. */
export function trackEvent<E extends AnalyticsEventName>(
  event: E,
  props: EventProps[E],
): void {
  void track(event, props);
}
