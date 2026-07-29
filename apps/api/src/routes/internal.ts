import { Router, type Request, type Response, type NextFunction } from "express";
import { activitySweepService } from "../services/activitySweepService.js";

export const internalRouter = Router();

function isAuthorizedCron(authorization: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  return authorization === `Bearer ${secret}`;
}

async function sweepInactive(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isAuthorizedCron(req.headers.authorization)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result = await activitySweepService.sweep();
    res.json({
      ok: true,
      sweptRoomCount: result.roomIds.length,
      roomIds: result.roomIds,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Vercel Cron (GET) + manual ops (POST): republish skip state for rooms whose
 * guests just aged out of the active TTL.
 */
internalRouter.get("/sweep-inactive", sweepInactive);
internalRouter.post("/sweep-inactive", sweepInactive);
