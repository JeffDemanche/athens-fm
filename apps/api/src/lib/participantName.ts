import {
  PARTICIPANT_NAME_MAX_LENGTH,
} from "../entities/Participant.js";
import { AppError } from "../middleware/errorHandler.js";

export function normalizeParticipantName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");

  if (!name) {
    throw new AppError("Enter a display name to join.", 400);
  }

  if (name.length > PARTICIPANT_NAME_MAX_LENGTH) {
    throw new AppError(
      `Display names can be at most ${PARTICIPANT_NAME_MAX_LENGTH} characters.`,
      400,
    );
  }

  return name;
}

export function participantNameKey(name: string): string {
  return name.toLocaleLowerCase("en-US");
}

export function isDuplicateParticipantNameError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybe = error as { code?: number; message?: string; keyPattern?: object };
  if (maybe.code !== 11000) {
    return false;
  }

  const message = maybe.message ?? "";
  return (
    message.includes("nameKey") ||
    Boolean(
      maybe.keyPattern &&
        typeof maybe.keyPattern === "object" &&
        "nameKey" in maybe.keyPattern,
    )
  );
}

export const DUPLICATE_PARTICIPANT_NAME_MESSAGE =
  "That name is already taken in this room. Choose another.";
