import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath = "supabase/migrations/202610230001_kanban_atomic_ordering.sql";
const migration = readFileSync(migrationPath, "utf8");
const client = readFileSync("src/features/quadro-producao/quadro-producao-client.tsx", "utf8");
const api = readFileSync("src/features/quadro-producao/api.ts", "utf8");

function functionBody(name: string, nextName: string) {
  const start = migration.indexOf(`create function public.${name}`);
  const fallbackStart = migration.indexOf(`create or replace function public.${name}`);
  const resolvedStart = start >= 0 ? start : fallbackStart;
  const end = migration.indexOf(nextName, resolvedStart + 1);
  assert.ok(resolvedStart >= 0, `${name} deve existir na migration corretiva`);
  return migration.slice(resolvedStart, end >= 0 ? end : undefined);
}

test("movimento persiste o indice calculado e nunca força o card para zero", () => {
  const body = functionBody("move_kanban_card", "create or replace function public.sort_kanban_cards_by_delivery_date");
  assert.match(body, /kanban_ordem = v_clamped_target/g);
  assert.doesNotMatch(body, /set[\s\S]{0,80}kanban_ordem\s*=\s*0/);
  assert.match(body, /pg_advisory_xact_lock[\s\S]+?'kanban-card-order'/);
  assert.match(body, /kanban_column_id = v_source_column_id/);
  assert.match(body, /kanban_column_id = p_kanban_column_id/);
});

test("movimento resolve ancoras estaveis para listas filtradas", () => {
  const body = functionBody("move_kanban_card", "create or replace function public.sort_kanban_cards_by_delivery_date");
  assert.match(body, /p_previous_card_id uuid default null/);
  assert.match(body, /p_next_card_id uuid default null/);
  assert.match(body, /p_next_card_id[\s\S]+?v_anchor_order/);
  assert.match(body, /p_previous_card_id[\s\S]+?v_anchor_order/);
  assert.match(api, /previousCardId[\s\S]+?nextCardId/);
});

test("ordenacao geral usa um unico RPC atomico particionado por coluna", () => {
  const body = functionBody("sort_all_kanban_cards_by_delivery_date", "create or replace function public.set_ficha_delivery_status_atomic");
  assert.match(body, /pg_advisory_xact_lock[\s\S]+?'kanban-card-order'/);
  assert.match(body, /partition by kanban_column_id/);
  assert.match(body, /order by data_entrega asc nulls last, kanban_ordem, is_manual, id/);
  assert.match(body, /from public\.fichas/);
  assert.match(body, /from public\.kanban_manual_cards/);
  assert.match(body, /update public\.fichas/);
  assert.match(body, /update public\.kanban_manual_cards/);
  assert.match(api, /\/api\/quadro-producao\/sort-by-date/);
});

test("criacao, entrega e exclusao mantem a ordem combinada densa", () => {
  assert.match(migration, /assign_ficha_kanban_order_on_insert/);
  assert.match(migration, /fichas_resequence_kanban_after_delete/);
  assert.match(migration, /manual_cards_resequence_kanban_after_delete/);
  const delivery = functionBody("set_ficha_delivery_status_atomic", "create or replace function public.assign_ficha_kanban_order_on_insert");
  assert.match(delivery, /union all[\s\S]+?public\.kanban_manual_cards/);
  assert.match(delivery, /row_number\(\) over \(order by kanban_ordem, is_manual, id\)/);
});

test("cliente usa fila, IDs em namespace e plugins sortable padrao", () => {
  assert.match(client, /scope: \{ id: "kanban-card-order" \}/);
  assert.match(client, /getCardDndId\(card\.id\)/);
  assert.match(client, /getColumnDndId\(column\.id\)/);
  assert.doesNotMatch(client, /plugins:\s*CARD_SORTABLE_PLUGINS/);
  assert.match(client, /isSortable\(source\)/);
  assert.match(client, /source\.group/);
  assert.match(client, /source\.index/);
  assert.match(client, /event\.canceled \|\| !target/);
});
