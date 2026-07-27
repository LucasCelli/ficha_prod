import "server-only";

import { addDaysToInput, getBusinessTodayInput } from "@/lib/dates";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateComparison, normalizePersonalStatus, projectMonthlyTotal } from "./analytics";

export type PersonalFicha = {
  id: string;
  cliente_nome_snapshot: string;
  arte: string | null;
  imageUrl: string | null;
  numero_venda: string | null;
  created_at: string;
  updated_at: string;
  data_entrega: string;
  delivered_at: string | null;
  status: "pendente" | "entregue" | "cancelado";
  vendedor: string | null;
  pieces: number;
};

export type PersonalDashboardData = {
  allTimeTotal: number;
  averageLeadDays: number | null;
  comparison: number | null;
  goal: { fichas: number; pieces: number; currentFichas: number; currentPieces: number; projectedFichas: number; projectedPieces: number } | null;
  idle: PersonalFicha[];
  lastLoginAt: string | null;
  metrics: { atrasadas: number; canceladas: number; entregues: number; fichas: number; noPrazo: number; pendentes: number; pieces: number };
  page: number;
  pageSize: number;
  recent: PersonalFicha[];
  series: { date: string; total: number }[];
  total: number;
  upcoming: PersonalFicha[];
  user: { displayName: string; role: string; username: string };
};

export type PersonalDashboardResult =
  | { kind: "ok"; data: PersonalDashboardData }
  | { kind: "not-configured" }
  | { kind: "error"; message: string };

const PAGE_SIZE = 20;
const FICHA_SELECT = "id,cliente_nome_snapshot,arte,numero_venda,created_at,updated_at,data_entrega,delivered_at,status,vendedor,ficha_itens(quantidade),ficha_imagens(url,ordem)";

export async function getPersonalDashboardData(input: {
  userId: string; displayName: string; username: string; role: string;
  period?: string; status?: string; busca?: string; page?: number;
}): Promise<PersonalDashboardResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) return { kind: "not-configured" };

  try {
    const supabase = createServerSupabaseClient();
    const today = getBusinessTodayInput();
    const monthStart = `${today.slice(0, 7)}-01`;
    const previousMonthDate = new Date(`${monthStart}T12:00:00Z`);
    previousMonthDate.setUTCMonth(previousMonthDate.getUTCMonth() - 1);
    const previousMonthStart = previousMonthDate.toISOString().slice(0, 10);
    const selectedDays = input.period === "7" || input.period === "90" ? Number(input.period) : null;
    const since = selectedDays ? addDaysToInput(today, -(selectedDays - 1)) : monthStart;
    const previousSince = selectedDays ? addDaysToInput(since, -selectedDays) : previousMonthStart;
    const page = Math.max(1, input.page ?? 1);
    const status = normalizePersonalStatus(input.status);
    const search = input.busca?.trim();

    let listQuery = supabase.from("fichas").select(FICHA_SELECT, { count: "exact" })
      .eq("created_by_user_id", input.userId).order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (status === "atrasado") listQuery = listQuery.neq("status", "entregue").lt("data_entrega", today);
    else if (status !== "todos") listQuery = listQuery.eq("status", status);
    if (search) listQuery = listQuery.ilike("cliente_nome_snapshot", `%${search.replace(/[%_]/g, "")}%`);

    const [periodRows, previousRows, monthRows, listResult, goalResult, userResult, allTimeResult] = await Promise.all([
      supabase.from("fichas").select(FICHA_SELECT).eq("created_by_user_id", input.userId).gte("created_at", `${since}T00:00:00Z`),
      supabase.from("fichas").select("id", { count: "exact", head: true }).eq("created_by_user_id", input.userId)
        .gte("created_at", `${previousSince}T00:00:00Z`).lt("created_at", `${since}T00:00:00Z`),
      supabase.from("fichas").select(FICHA_SELECT).eq("created_by_user_id", input.userId).gte("created_at", `${monthStart}T00:00:00Z`),
      listQuery,
      supabase.from("user_monthly_goals").select("fichas_target,pieces_target").eq("user_id", input.userId).eq("month", monthStart).maybeSingle(),
      supabase.from("app_users").select("last_login_at").eq("id", input.userId).maybeSingle(),
      supabase.from("fichas").select("id", { count: "exact", head: true }).eq("created_by_user_id", input.userId),
    ]);
    const error = periodRows.error ?? previousRows.error ?? monthRows.error ?? listResult.error ?? goalResult.error ?? userResult.error ?? allTimeResult.error;
    if (error) return { kind: "error", message: error.message };

    const periodFichas = mapRows(periodRows.data ?? []);
    const monthFichas = mapRows(monthRows.data ?? []);
    const listFichas = mapRows(listResult.data ?? []);
    const delivered = periodFichas.filter((f) => f.status === "entregue");
    const leadDays = delivered.filter((f) => f.delivered_at)
      .map((f) => (new Date(f.delivered_at!).getTime() - new Date(f.created_at).getTime()) / 86_400_000);
    const previousCount = previousRows.count ?? 0;
    const currentCount = periodFichas.length;
    const currentPieces = monthFichas.reduce((sum, ficha) => sum + ficha.pieces, 0);
    const elapsedDays = Math.max(1, Number(today.slice(8, 10)));
    const monthDays = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).getUTCDate();
    const staleBefore = addDaysToInput(today, -7);

    return { kind: "ok", data: {
      allTimeTotal: allTimeResult.count ?? 0,
      averageLeadDays: leadDays.length ? leadDays.reduce((sum, value) => sum + value, 0) / leadDays.length : null,
      comparison: calculateComparison(currentCount, previousCount),
      goal: goalResult.data ? {
        fichas: goalResult.data.fichas_target, pieces: goalResult.data.pieces_target,
        currentFichas: monthFichas.length, currentPieces,
        projectedFichas: projectMonthlyTotal(monthFichas.length, elapsedDays, monthDays),
        projectedPieces: projectMonthlyTotal(currentPieces, elapsedDays, monthDays),
      } : null,
      idle: periodFichas.filter((f) => f.status === "pendente" && f.updated_at.slice(0, 10) <= staleBefore).slice(0, 5),
      lastLoginAt: userResult.data?.last_login_at ?? null,
      metrics: {
        atrasadas: periodFichas.filter((f) => f.status !== "entregue" && f.data_entrega < today).length,
        canceladas: periodFichas.filter((f) => f.status === "cancelado").length,
        entregues: delivered.length,
        fichas: currentCount,
        noPrazo: delivered.filter((f) => f.delivered_at && f.delivered_at.slice(0, 10) <= f.data_entrega).length,
        pendentes: periodFichas.filter((f) => f.status === "pendente").length,
        pieces: periodFichas.reduce((sum, f) => sum + f.pieces, 0),
      },
      page, pageSize: PAGE_SIZE, recent: listFichas, series: buildSeries(periodFichas, since, today),
      total: listResult.count ?? 0,
      upcoming: periodFichas.filter((f) => f.status === "pendente").sort((a, b) => a.data_entrega.localeCompare(b.data_entrega)).slice(0, 5),
      user: { displayName: input.displayName, role: input.role, username: input.username },
    }};
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : "Falha ao carregar o painel pessoal." };
  }
}

function mapRows(rows: Array<Record<string, unknown>>): PersonalFicha[] {
  return rows.map((row) => ({
    id: String(row.id), cliente_nome_snapshot: String(row.cliente_nome_snapshot), created_at: String(row.created_at),
    arte: row.arte ? String(row.arte) : null,
    imageUrl: Array.isArray(row.ficha_imagens) ? String(row.ficha_imagens[0]?.url ?? "") || null : null,
    numero_venda: row.numero_venda ? String(row.numero_venda) : null,
    updated_at: String(row.updated_at), data_entrega: String(row.data_entrega),
    delivered_at: row.delivered_at ? String(row.delivered_at) : null, status: row.status as PersonalFicha["status"],
    vendedor: row.vendedor ? String(row.vendedor) : null,
    pieces: Array.isArray(row.ficha_itens) ? row.ficha_itens.reduce((sum: number, item: { quantidade?: number | null }) => sum + (item.quantidade ?? 0), 0) : 0,
  }));
}
function buildSeries(rows: PersonalFicha[], since: string, today: string) {
  const buckets = new Map<string, number>();
  for (let cursor = since; cursor <= today; cursor = addDaysToInput(cursor, 1)) buckets.set(cursor, 0);
  rows.forEach((row) => { const key = row.created_at.slice(0, 10); if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1); });
  return Array.from(buckets, ([date, total]) => ({ date, total }));
}
