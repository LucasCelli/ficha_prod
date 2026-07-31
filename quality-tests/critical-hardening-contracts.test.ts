import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260731032229_critical_integrity_hardening.sql", "utf8");
const cloudinaryDeleteRoute = readFileSync("src/app/api/cloudinary/image/[...publicId]/route.ts", "utf8");
const cloudinarySignatureRoute = readFileSync("src/app/api/cloudinary/signature/route.ts", "utf8");
const fichaActions = readFileSync("src/features/fichas/actions.ts", "utf8");

test("mantém login e cotas operacionais persistentes e restritos ao service role", () => {
  assert.match(migration, /create table if not exists public\.app_login_rate_limits/);
  assert.match(migration, /create table if not exists public\.app_operation_rate_limits/);
  assert.match(migration, /revoke execute on function public\.consume_login_attempt\(text\[\]\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.consume_operation_quota\(text, integer, integer\) to service_role/);
});

test("salva ficha, itens e imagens por uma única RPC transacional", () => {
  assert.match(migration, /create or replace function public\.save_ficha_atomic/);
  assert.match(fichaActions, /\.rpc\("save_ficha_atomic"/);
  assert.doesNotMatch(fichaActions, /rollbackCreatedFicha|resolveClienteId/);
});

test("não aceita autorização de exclusão nem public id definidos pelo cliente", () => {
  assert.doesNotMatch(cloudinaryDeleteRoute, /excludeFichaId/);
  assert.match(cloudinaryDeleteRoute, /MANAGED_PUBLIC_ID_PATTERN/);
  assert.match(cloudinaryDeleteRoute, /\.from\("ficha_imagens"\)/);
  assert.doesNotMatch(cloudinarySignatureRoute, /body\.public_id|parsed\.data\.public_id/);
  assert.match(cloudinarySignatureRoute, /randomUUID\(\)/);
});