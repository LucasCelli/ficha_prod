import { createHash } from "node:crypto";

function hashAttemptDimension(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function getClientOrigin(requestHeaders: Headers) {
  const forwarded =
    requestHeaders.get("x-vercel-forwarded-for") ??
    requestHeaders.get("x-forwarded-for") ??
    requestHeaders.get("x-real-ip") ??
    "unavailable";

  return forwarded.split(",")[0]?.trim().toLowerCase() || "unavailable";
}

export function getLoginAttemptKeys(username: string, requestHeaders: Headers) {
  const normalizedUsername = username.trim().toLowerCase();
  const origin = getClientOrigin(requestHeaders);
  const accountHash = hashAttemptDimension(normalizedUsername);
  const originHash = hashAttemptDimension(origin);

  return [
    `account:${accountHash}`,
    `origin:${originHash}`,
    `pair:${hashAttemptDimension(`${normalizedUsername}:${origin}`)}`,
  ];
}

export function getLoginRateLimitMessage(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return minutes === 1 ? "Muitas tentativas. Aguarde 1 minuto." : `Muitas tentativas. Aguarde ${minutes} minutos.`;
}
