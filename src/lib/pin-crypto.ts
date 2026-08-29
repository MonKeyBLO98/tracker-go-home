import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const DEFAULT_PIN = "0000";
export const PIN_FORMAT = /^\d{4,6}$/;
const KEYLEN = 32;

export function hashPin(pin: string, salt = randomBytes(16).toString("hex")): string {
  const derived = scryptSync(pin, salt, KEYLEN).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPin(stored: string | null | undefined, candidate: string): boolean {
  if (!stored) {
    return candidate === DEFAULT_PIN;
  }
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(candidate, salt, KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

export function isValidPinFormat(pin: string): boolean {
  return PIN_FORMAT.test(pin);
}
