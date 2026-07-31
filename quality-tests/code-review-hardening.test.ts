import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";
import { getFichaDeleteConfirmationCode } from "../src/features/fichas/delete-confirmation.ts";
import { mapWithConcurrency } from "../src/lib/promise-pool.ts";
import { sanitizeObservationHtml } from "../src/lib/sanitize-observations.ts";

const migration = readFileSync("supabase/migrations/20260731203921_code_review_hardening.sql", "utf8");

test("sanitização mantém apenas a formatação permitida", () => {
  const input = '<svg onload=alert(1)><script>alert(2)</script><p onclick="alert(3)">Texto <strong data-x="1">forte</strong></p>';
  const output = sanitizeObservationHtml(input);
  assert.equal(output, "<p>Texto <strong>forte</strong></p>");
  assert.doesNotMatch(output, /script|svg|onload|onclick|data-x/i);
});

test("confirmação de exclusão deriva do UUID", () => {
  assert.equal(getFichaDeleteConfirmationCode("123e4567-e89b-12d3-a456-426614174000"), "4000");
  assert.equal(getFichaDeleteConfirmationCode("não-é-uuid"), "");
});

test("pool limita concorrência e preserva ordem", async () => {
  let active = 0;
  let peak = 0;
  const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return value * 2;
  });
  assert.deepEqual(result, [2, 4, 6, 8, 10]);
  assert.equal(peak, 2);
});

test("todas as páginas privadas validam a sessão explicitamente", () => {
  const pages = listFiles("src/app").filter((path) => path.endsWith("page.tsx") && path !== "src/app/login/page.tsx");
  for (const page of pages) {
    assert.match(readFileSync(page, "utf8"), /require(?:AppSession|Superadmin)\(\)/, page);
  }
});

test("PDF busca todos os lotes e ignora a página da tela", () => {
  const data = readFileSync("src/features/fichas/data.ts", "utf8");
  const route = readFileSync("src/app/fichas/pdf/route.ts", "utf8");
  const overview = readFileSync("src/features/fichas/fichas-overview.tsx", "utf8");
  assert.match(data, /OPERATIONAL_PDF_BATCH_SIZE = 500/);
  assert.match(data, /while \(total === null \|\| fichas\.length < total\)/);
  assert.doesNotMatch(route, /normalizePageFilter|searchParams\.get\("page"\)/);
  assert.doesNotMatch(overview.slice(overview.indexOf("function hrefForPdf")), /params\.set\("page"/);
});

test("migration cobre retenção, legado, limites e Kanban agregado", () => {
  for (const pattern of [
    /occurred_at < now\(\) - interval '90 days'/,
    /last_seen_at < now\(\) - interval '7 days'/,
    /jsonb_array_length\(p_itens\) > 200/,
    /create or replace function public\.get_kanban_board_cards/,
    /sum\(coalesce\(item\.quantidade, 0\)\)/,
    /cron\.schedule/,
    /observacoes_html = null/,
  ]) assert.match(migration, pattern);
});

test("Kanban converte JSON inválido em falha de validação", () => {
  for (const route of [
    "src/app/api/quadro-producao/cards/[id]/move/route.ts",
    "src/app/api/quadro-producao/cards/manual/route.ts",
    "src/app/api/quadro-producao/columns/[id]/route.ts",
    "src/app/api/quadro-producao/columns/reorder/route.ts",
    "src/app/api/quadro-producao/columns/route.ts",
  ]) assert.match(readFileSync(route, "utf8"), /request\.json\(\)\.catch\(\(\) => null\)/);
});

test("Kanban mantem dimensoes estaveis e atualiza o destino sem atraso artificial", () => {
  const client = readFileSync("src/features/quadro-producao/quadro-producao-client.tsx", "utf8");
  const state = readFileSync("src/features/quadro-producao/quadro-producao-state.ts", "utf8");
  const styles = readFileSync("src/styles/globals.css", "utf8");

  assert.match(client, /const KanbanColumn = memo/);
  assert.doesNotMatch(client, /requestAnimationFrame|pendingDestinationRef|dragFrameRef|isCardDragging/);
  assert.match(state, /DND_TIMING = \{ duration: 90,/);
  assert.doesNotMatch(styles, /contain-intrinsic-block-size|content-visibility/);
});

function listFiles(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? listFiles(path) : [relative(".", path).split(sep).join("/")];
  });
}
