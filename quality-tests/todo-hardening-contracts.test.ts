import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { addMonthsToInput, getBusinessTodayInput, getBusinessWeekRange } from "../src/lib/dates.ts";

const migration = readFileSync("supabase/migrations/20260731034518_complete_todo_hardening.sql", "utf8");

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? findRouteFiles(path) : entry.name === "route.ts" ? [path] : [];
  });
}

test("audita falhas de login somente com dimensões hash", () => {
  assert.match(migration, /create table public\.app_login_failure_events/);
  assert.match(migration, /account_key text not null/);
  assert.match(migration, /origin_key text not null/);
  assert.match(migration, /pair_key text not null/);
  const auditTableDdl = migration.slice(migration.indexOf("create table public.app_login_failure_events"), migration.indexOf(");", migration.indexOf("create table public.app_login_failure_events")) + 2);
  assert.doesNotMatch(auditTableDdl, /\b(pin|username|ip_address)\b/i);
  assert.match(migration, /grant execute on function public\.record_login_failure\(text\[\]\) to service_role/);
});

test("mantém apenas status persistidos pendente e entregue", () => {
  assert.match(migration, /update public\.fichas\s+set status = 'pendente'\s+where status::text = 'cancelado'/);
  assert.match(migration, /create type public\.ficha_status as enum \('pendente', 'entregue'\)/);
  assert.doesNotMatch(readFileSync("src/lib/supabase/database.types.ts", "utf8"), /"cancelado"/);
});

test("deduplica sessão na request e limita escrita de last_seen no banco", () => {
  const session = readFileSync("src/features/auth/session.ts", "utf8");
  assert.match(session, /cache\(async \(\)/);
  assert.match(session, /\.rpc\("resolve_app_session"/);
  assert.match(migration, /last_seen_at <= p_seen_at - interval '5 minutes'/);
});

test("serializa mutações de Kanban e mantém ordens densas", () => {
  assert.match(migration, /pg_advisory_xact_lock\(pg_catalog\.hashtextextended\('kanban-card-order'/);
  assert.match(migration, /create_manual_kanban_card_atomic/);
  assert.match(migration, /row_number\(\) over \(order by[\s\S]+?\) - 1 as (?:next_order|dense_index)/);
  const data = readFileSync("src/features/quadro-producao/data.ts", "utf8");
  assert.match(data, /\.rpc\("create_manual_kanban_card_atomic"/);
  const fichaMigration = readFileSync("supabase/migrations/20260731032229_critical_integrity_hardening.sql", "utf8");
  assert.match(fichaMigration, /hashtextextended\('kanban-card-order', 0\)[\s\S]+?max\(kanban_ordem\) \+ 1/);
  assert.doesNotMatch(data, /count:\s*"exact"[\s\S]{0,600}\.insert\(/);
});

test("agrega painéis e relatórios no Postgres e pagina detalhes", () => {
  assert.match(migration, /create or replace function public\.get_personal_dashboard_summary/);
  assert.match(migration, /create or replace function public\.get_personal_fichas_page/);
  assert.match(migration, /create or replace function public\.get_report_summary/);
  assert.match(migration, /create or replace function public\.get_report_details_page/);
  const reportData = readFileSync("src/features/relatorios/data.ts", "utf8");
  assert.match(reportData, /for \(let offset = 0; ; offset \+= DETAIL_PAGE_SIZE\)/);
  assert.doesNotMatch(reportData, /MAX_(?:ROWS|PAGES)|safe limit/i);
  const excelRoute = readFileSync("src/app/relatorios/excel/route.ts", "utf8");
  const pdfRoute = readFileSync("src/app/relatorios/pdf/route.ts", "utf8");
  assert.match(excelRoute, /new ExcelJS\.stream\.xlsx\.WorkbookWriter/);
  assert.match(excelRoute, /for await \(const page of iterateRelatorioDetalhes\(filters\)\)/);
  assert.doesNotMatch(excelRoute, /includeDetails|data\.detalhes\.map/);
  assert.doesNotMatch(pdfRoute, /includeDetails/);
});

test("todas as rotas com dados usam a fronteira autenticada", () => {
  const routes = findRouteFiles("src/app").filter((path) => !path.endsWith(join("logout", "route.ts")));
  const unprotected = routes.filter((path) => !readFileSync(path, "utf8").includes("withAuthenticatedRoute"));
  assert.deepEqual(unprotected, []);
});

test("datas de negócio respeitam Cuiabá na virada UTC", () => {
  assert.equal(getBusinessTodayInput(new Date("2026-07-30T03:59:59.000Z")), "2026-07-29");
  assert.equal(getBusinessTodayInput(new Date("2026-07-30T04:00:00.000Z")), "2026-07-30");
  assert.deepEqual(getBusinessWeekRange(0, new Date("2026-08-02T16:00:00.000Z")), {
    start: "2026-07-27",
    end: "2026-08-02",
  });
  assert.equal(addMonthsToInput("2026-03-01", -1), "2026-02-01");
});

test("configura headers defensivos compatíveis com serviços externos", () => {
  const config = readFileSync("next.config.mjs", "utf8");
  for (const header of ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) {
    assert.match(config, new RegExp(header));
  }
  assert.match(config, /https:\/\/api\.cloudinary\.com/);
  assert.match(config, /https:\/\/\*\.supabase\.co/);
});