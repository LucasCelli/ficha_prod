import "dotenv/config";
import { createClient as createLibsqlClient } from "@libsql/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BACKUP_DIR = join("data", "backups");
const SUPABASE_TABLES = ["clientes", "fichas", "ficha_itens", "ficha_imagens", "catalog_items"];
const PAGE_SIZE = 1000;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Configure ${name} antes de gerar o snapshot de corte.`);
  }
  return value;
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function fetchLegacyFichas() {
  const legacyDb = createLibsqlClient({
    authToken: requiredEnv("TURSO_AUTH_TOKEN"),
    url: requiredEnv("TURSO_DATABASE_URL"),
  });
  const result = await legacyDb.execute({
    sql: "select * from fichas where coalesce(is_manual_card, 0) = 0 order by id asc",
    args: [],
  });
  return result.rows;
}

async function fetchAllRows(supabase, table) {
  const rows = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase.from(table).select("*").range(from, to);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
    page += 1;
  }
}

async function fetchAuthSummary(supabase) {
  const { data, error } = await supabase
    .from("app_users")
    .select("username,display_name,role,active,created_at,last_login_at")
    .order("role", { ascending: false })
    .order("username", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function main() {
  mkdirSync(BACKUP_DIR, { recursive: true });

  const generatedAt = new Date();
  const supabase = createSupabaseClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  const legacyFichas = await fetchLegacyFichas();
  const supabaseTables = {};
  for (const table of SUPABASE_TABLES) {
    supabaseTables[table] = await fetchAllRows(supabase, table);
  }

  const snapshot = {
    generatedAt: generatedAt.toISOString(),
    source: {
      legacy: "turso:fichas",
      target: "supabase:public",
    },
    counts: {
      legacy: {
        fichas: legacyFichas.length,
      },
      supabase: Object.fromEntries(Object.entries(supabaseTables).map(([table, rows]) => [table, rows.length])),
    },
    authSummary: await fetchAuthSummary(supabase),
    legacy: {
      fichas: legacyFichas,
    },
    supabase: supabaseTables,
  };

  const fileName = `cutover-snapshot-${timestampForFile(generatedAt)}.json`;
  const filePath = join(BACKUP_DIR, fileName);
  writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(`[cutover-backup] Arquivo: ${filePath}`);
  console.log(`[cutover-backup] Legado fichas: ${snapshot.counts.legacy.fichas}`);
  for (const [table, count] of Object.entries(snapshot.counts.supabase)) {
    console.log(`[cutover-backup] Supabase ${table}: ${count}`);
  }
  console.log(`[cutover-backup] Usuarios no resumo: ${snapshot.authSummary.length}`);
}

main().catch((error) => {
  console.error("[cutover-backup] Falha ao gerar snapshot:", error);
  process.exitCode = 1;
});
