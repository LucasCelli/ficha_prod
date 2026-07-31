import assert from "node:assert/strict";
import test from "node:test";
import { getLoginAttemptKeys, getLoginRateLimitMessage } from "../src/features/auth/login-rate-limit.ts";

test("gera chaves estáveis sem guardar usuário ou IP em texto puro", () => {
  const first = getLoginAttemptKeys(" Lucas ", new Headers({ "x-vercel-forwarded-for": "203.0.113.10" }));
  const second = getLoginAttemptKeys("lucas", new Headers({ "x-vercel-forwarded-for": "203.0.113.10" }));

  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.ok(first[0]?.startsWith("account:"));
  assert.ok(first[1]?.startsWith("origin:"));
  assert.ok(first[2]?.startsWith("pair:"));
  assert.ok(first.every((key) => !key.includes("lucas") && !key.includes("203.0.113.10")));
});

test("separa limite de conta e origem", () => {
  const first = getLoginAttemptKeys("lucas", new Headers({ "x-vercel-forwarded-for": "203.0.113.10" }));
  const second = getLoginAttemptKeys("lucas", new Headers({ "x-vercel-forwarded-for": "203.0.113.11" }));

  assert.equal(first[0], second[0]);
  assert.notEqual(first[1], second[1]);
  assert.notEqual(first[2], second[2]);
});

test("formata espera mínima em minutos", () => {
  assert.equal(getLoginRateLimitMessage(1), "Muitas tentativas. Aguarde 1 minuto.");
  assert.equal(getLoginRateLimitMessage(61), "Muitas tentativas. Aguarde 2 minutos.");
});
