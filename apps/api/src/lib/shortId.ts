import { randomInt } from "node:crypto";

/** Ambiguity-safe alphabet (no 0/O, 1/I/L). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const SHORT_ID_LENGTH = 5;

export function generateShortId(length = SHORT_ID_LENGTH): string {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += ALPHABET[randomInt(ALPHABET.length)];
  }
  return result;
}

export function normalizeShortId(value: string): string {
  return value.trim().toUpperCase();
}

export function isShortId(value: string): boolean {
  return new RegExp(`^[${ALPHABET}]{${SHORT_ID_LENGTH}}$`).test(
    normalizeShortId(value),
  );
}
