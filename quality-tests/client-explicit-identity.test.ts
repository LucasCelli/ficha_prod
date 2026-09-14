import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260910012830_client_identity_and_explicit_creation.sql", "utf8");
const fichaActions = readFileSync("src/features/fichas/actions.ts", "utf8");
const picker = readFileSync("src/features/fichas/cliente-picker.tsx", "utf8");
const options = readFileSync("src/features/fichas/form-options.ts", "utf8");

test("cliente usa identidade estável e ficha não cria cliente implicitamente", () => {
  assert.match(fichaActions, /cliente_id: values\.clienteId/);
  assert.doesNotMatch(fichaActions, /\.from\("clientes"\)\.insert/);
  assert.match(migration, /v_cliente_id := nullif\(p_ficha->>'cliente_id'/);
  assert.match(migration, /Selecione um cliente cadastrado/);
});

test("unicidade considera nome e empresa normalizados sem mesclar dados antigos", () => {
  assert.match(migration, /unique index clientes_identidade_normalizada_unique/);
  assert.match(migration, /\(nome_normalizado, empresa_normalizada\)/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.doesNotMatch(migration, /delete from public\.clientes/i);
});

test("homônimos são apresentados por empresa e selecionados por id", () => {
  assert.match(options, /description: cliente\.empresa/);
  assert.match(options, /value: cliente\.id/);
  assert.match(picker, /name="clienteId"/);
  assert.match(picker, /Novo Cliente/);
  assert.match(picker, /select\(cliente\.id, option\)/);
});

test("cancelar cadastro não executa criação nem usa atrasos artificiais", () => {
  assert.match(picker, /onClick=\{onCancel\}/);
  assert.match(picker, /onClose=\{onCancel\}/);
  assert.doesNotMatch(picker, /setTimeout/);
});

test("salvar cliente inline não dispara o envio da ficha", () => {
  assert.match(picker, /onSubmit=\{\(event\) => event\.stopPropagation\(\)\}/);
});
