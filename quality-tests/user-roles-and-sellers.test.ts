import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260901031811_user_roles_and_seller_selection.sql", "utf8");
const formOptions = readFileSync("src/features/fichas/form-options.ts", "utf8");
const fichaForm = readFileSync("src/features/fichas/ficha-form.tsx", "utf8");
const fichaActions = readFileSync("src/features/fichas/actions.ts", "utf8");

test("migração preserva Admin e converte operadores existentes em Vendedores", () => {
  assert.match(migration, /rename value 'operador' to 'vendedor'/);
  assert.match(migration, /add value if not exists 'designer'/);
});

test("opções de vendedor vêm somente de usuários Vendedores ativos", () => {
  assert.match(formOptions, /from\("app_users"\)/);
  assert.match(formOptions, /eq\("role", "vendedor"\)/);
  assert.match(formOptions, /eq\("active", true\)/);
  assert.doesNotMatch(formOptions, /from\("fichas"\)/);
});

test("ficha usa select fechado e valida o vendedor no servidor", () => {
  const sellerField = fichaForm.slice(fichaForm.indexOf('<Field label="Vendedor"'), fichaForm.indexOf('<Field label="Data de Início"'));
  assert.match(sellerField, /<CustomSelect/);
  assert.doesNotMatch(sellerField, /CustomDatalist/);
  assert.match(fichaActions, /async function isActiveSeller/);
  assert.match(fichaActions, /if \(!seller\.valid\) return getInvalidSellerState\(\)/g);
});
