import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPinHash(pin: string) {
  const salt = randomBytes(16).toString("base64url");
  return {
    hash: hashPin(pin, salt),
    salt,
  };
}

export function hashPin(pin: string, salt: string) {
  return scryptSync(pin, salt, KEY_LENGTH).toString("base64url");
}

export function verifyPin(pin: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(hashPin(pin, salt), "base64url");
  const expected = Buffer.from(expectedHash, "base64url");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
