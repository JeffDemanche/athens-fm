import { ACTIVE_SWEEP_INTERVAL_MS } from "../lib/activeParticipant.js";
import {
  activitySweepService,
  type ActivitySweepService,
} from "./activitySweepService.js";

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * In-process poll for guest inactivity (Docker / long-lived Fluid instances).
 * Vercel Cron also hits POST /api/internal/sweep-inactive as a safety net.
 */
export function startActivitySweepLoop(
  sweep: ActivitySweepService = activitySweepService,
  intervalMs: number = ACTIVE_SWEEP_INTERVAL_MS,
): void {
  if (timer) {
    return;
  }

  const tick = () => {
    void sweep.sweep().catch((error) => {
      console.warn("[api] activity sweep failed", error);
    });
  };

  timer = setInterval(tick, intervalMs);
  // Unref so the timer does not keep a process alive during tests / shutdown.
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

export function stopActivitySweepLoop(): void {
  if (!timer) {
    return;
  }
  clearInterval(timer);
  timer = null;
}
