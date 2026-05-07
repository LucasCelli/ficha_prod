import "dotenv/config";

import { createClient as createLibsqlClient } from "@libsql/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

async function fetchLegacyRows() {
  const legacyDb = createLibsqlClient({
    authToken: requiredEnv("TURSO_AUTH_TOKEN"),
    url: requiredEnv("TURSO_DATABASE_URL"),
  });

  const result = await legacyDb.execute({
    sql: `
      select id, cliente, numero_venda, data_entrega, status
      from fichas
      where coalesce(is_manual_card, 0) = 0
      order by id asc
    `,
    args: [],
  });

  return result.rows.map((row) => ({
    cliente: row.cliente,
    dataEntrega: row.data_entrega,
    id: Number(row.id),
    numeroVenda: row.numero_venda,
    status: row.status,
  }));
}

async function fetchAllSupabaseFichas(supabase) {
  const rows = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("fichas")
      .select("id, legacy_ficha_id, cliente_nome_snapshot, numero_venda, data_entrega, status, is_manual_card")
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
    page += 1;
  }
}

function formatFicha(row) {
  const sale = row.numeroVenda ? ` venda ${row.numeroVenda}` : "";
  return `legacy ${row.id} - ${row.cliente ?? "Cliente sem nome"}${sale} - entrega ${row.dataEntrega ?? "sem data"}`;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function matchKey(row) {
  return [
    normalizeText(row.cliente ?? row.cliente_nome_snapshot),
    String(row.dataEntrega ?? row.data_entrega ?? ""),
    normalizeText(row.numeroVenda ?? row.numero_venda),
  ].join("|");
}

async function main() {
  const supabase = createSupabaseClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  const [legacyRows, supabaseRows] = await Promise.all([fetchLegacyRows(), fetchAllSupabaseFichas(supabase)]);
  const supabaseLegacyIds = new Set(
    supabaseRows
      .map((row) => row.legacy_ficha_id)
      .filter((id) => id != null)
      .map(Number),
  );

  const nativeRows = supabaseRows.filter((row) => row.legacy_ficha_id == null && !row.is_manual_card);
  const manualRows = supabaseRows.filter((row) => row.is_manual_card);
  const nativeBuckets = new Map();
  for (const row of nativeRows) {
    const key = matchKey(row);
    const bucket = nativeBuckets.get(key) ?? [];
    bucket.push(row);
    nativeBuckets.set(key, bucket);
  }

  const manualJsonMatches = [];
  const missingLegacyRows = [];

  for (const legacyRow of legacyRows) {
    if (supabaseLegacyIds.has(legacyRow.id)) continue;

    const key = matchKey(legacyRow);
    const bucket = nativeBuckets.get(key) ?? [];
    const nativeMatch = bucket.shift();
    if (bucket.length === 0) {
      nativeBuckets.delete(key);
    } else {
      nativeBuckets.set(key, bucket);
    }

    if (nativeMatch) {
      manualJsonMatches.push({ legacy: legacyRow, supabase: nativeMatch });
    } else {
      missingLegacyRows.push(legacyRow);
    }
  }

  const extraNativeRows = [...nativeBuckets.values()].flat();
  const coveredLegacyCount = supabaseLegacyIds.size + manualJsonMatches.length;
  const expectedOperationalTotal = legacyRows.length + extraNativeRows.length + manualRows.length;
  const hasExpectedTotal = supabaseRows.length >= expectedOperationalTotal;

  console.log("Cutover gap check:");
  console.log(`- Legado nao manual: ${legacyRows.length}`);
  console.log(`- Supabase total: ${supabaseRows.length}`);
  console.log(`- Supabase com legacy_ficha_id: ${supabaseLegacyIds.size}`);
  console.log(`- Legado coberto por JSON manual sem legacy_ficha_id: ${manualJsonMatches.length}`);
  console.log(`- Legado coberto total: ${coveredLegacyCount}`);
  console.log(`- Supabase nativas sem legado: ${extraNativeRows.length}`);
  console.log(`- Supabase cards manuais: ${manualRows.length}`);
  console.log(`- Total operacional esperado: ${expectedOperationalTotal}`);

  if (missingLegacyRows.length > 0) {
    console.log("\nFichas legadas faltantes:");
    for (const row of missingLegacyRows) {
      console.log(`- ${formatFicha(row)}`);
    }
  }

  if (manualJsonMatches.length > 0) {
    console.log("\nFichas legadas cobertas por JSON manual:");
    for (const match of manualJsonMatches) {
      console.log(`- ${formatFicha(match.legacy)} -> ${match.supabase.id}`);
    }
  }

  if (extraNativeRows.length > 0) {
    console.log("\nFichas nativas preservadas:");
    for (const row of extraNativeRows) {
      const sale = row.numero_venda ? ` venda ${row.numero_venda}` : "";
      console.log(`- ${row.id} - ${row.cliente_nome_snapshot}${sale} - entrega ${row.data_entrega ?? "sem data"}`);
    }
  }

  const isReady = missingLegacyRows.length === 0 && hasExpectedTotal;
  console.log(`\nStatus: ${isReady ? "ready-for-cutover-data" : "pending-cutover-data"}`);
  process.exitCode = isReady ? 0 : 1;
}

main().catch((error) => {
  console.error("[cutover-gap] Falha na checagem:", error);
  process.exitCode = 1;
});
