import "server-only";

import { addDaysToInput, getBusinessTodayInput } from "@/lib/dates";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PersonalPeriod = "7" | "30" | "90";
export type PersonalStatus = "todos" | "pendente" | "entregue" | "cancelado" | "atrasado";

export type PersonalFicha = {
  id: string;
  cliente_nome_snapshot: string;
  created_at: string;
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
  goal: { fichas: number; pieces: number } | null;
  lastLoginAt: string | null;
  metrics: {
    atrasadas: number;
    canceladas: number;
    entregues: number;
    fichas: number;
    noPrazo: number;
    pendentes: number;
    pieces: number;
  };
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

export async function getPersonalDashboardData(input: {
  userId: string;
  displayName: string;
  username: string;
  role: string;
  period?: string;
  status?: string;
  busca?: string;
  page?: number;
}): Promise<PersonalDashboardResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) return { kind: "not-configured" };

  try {
    const supabase = createServerSupabaseClient();
    const days = input.period === "7" || input.period === "90" ? Number(input.period) : 30;
    const today = getBusinessTodayInput();
    const since = addDaysToInput(today, -(days - 1));
    const previousSince = addDaysToInput(since, -days);
    const page = Math.max(1, input.page ?? 1);
    const status = normalizeStatus(input.status);
    const search = input.busca?.trim();

    let listQuery = supabase
      .from("fichas")
      .select("id,cliente_nome_snapshot,created_at,data_entrega,delivered_at,status,vendedor,ficha_itens(quantidade)", {
        count: "exact",
      })
      .eq("created_by_user_id", input.userId)
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (status === "atrasado") listQuery = listQuery.neq("status", "entregue").lt("data_entrega", today);
    else if (status !== "todos") listQuery = listQuery.eq("status", status);
    if (search) listQuery = listQuery.ilike("cliente_nome_snapshot", `%${search.replace(/[%_]/g, "")}%`);

    const month = `${today.slice(0, 7)}-01`;
    const [periodRows, previousRows, listResult, goalResult, userResult, allTimeResult] = await Promise.all([
      supabase
        .from("fichas")
        .select("id,cliente_nome_snapshot,created_at,data_entrega,delivered_at,status,vendedor,ficha_itens(quantidade)")
        .eq("created_by_user_id", input.userId)
        .gte("created_at", `${since}T00:00:00.000Z`),
      supabase
        .from("fichas")
        .select("id", { count: "exact", head: true })
        .eq("created_by_user_id", input.userId)
        .gte("created_at", `${previousSince}T00:00:00.000Z`)
        .lt("created_at", `${since}T00:00:00.000Z`),
      listQuery,
      supabase
        .from("user_monthly_goals")
        .select("fichas_target,pieces_target")
        .eq("user_id", input.userId)
        .eq("month", month)
        .maybeSingle(),
      supabase.from("app_users").select("last_login_at").eq("id", input.userId).maybeSingle(),
      supabase.from("fichas").select("id", { count: "exact", head: true }).eq("created_by_user_id", input.userId),
    ]);

    const error =
      periodRows.error ?? previousRows.error ?? listResult.error ?? goalResult.error ?? userResult.error ?? allTimeResult.error;
    if (error) return { kind: "error", message: error.message };

    const periodFichas = mapRows(periodRows.data ?? []);
    const listFichas = mapRows(listResult.data ?? []);
    const previousCount = previousRows.count ?? 0;
    const currentCount = periodFichas.length;
    const delivered = periodFichas.filter((f) => f.status === "entregue");
    const onTime = delivered.filter((f) => f.delivered_at && f.delivered_at.slice(0, 10) <= f.data_entrega);
    const leadDays = delivered
      .filter((f) => f.delivered_at)
      .map((f) => (new Date(f.delivered_at!).getTime() - new Date(f.created_at).getTime()) / 86_400_000);

    return {
      kind: "ok",
      data: {
        allTimeTotal: allTimeResult.count ?? 0,
        averageLeadDays: leadDays.length ? leadDays.reduce((sum, value) => sum + value, 0) / leadDays.length : null,
        comparison: previousCount ? ((currentCount - previousCount) / previousCount) * 100 : currentCount ? 100 : null,
        goal: goalResult.data
          ? { fichas: goalResult.data.fichas_target, pieces: goalResult.data.pieces_target }
          : null,
        lastLoginAt: userResult.data?.last_login_at ?? null,
        metrics: {
          atrasadas: periodFichas.filter((f) => f.status !== "entregue" && f.data_entrega < today).length,
          canceladas: periodFichas.filter((f) => f.status === "cancelado").length,
          entregues: delivered.length,
          fichas: currentCount,
          noPrazo: onTime.length,
          pendentes: periodFichas.filter((f) => f.status === "pendente").length,
          pieces: periodFichas.reduce((sum, f) => sum + f.pieces, 0),
        },
        page,
        pageSize: PAGE_SIZE,
        recent: listFichas,
        series: buildSeries(periodFichas, since, today),
        total: listResult.count ?? 0,
        upcoming: periodFichas
          .filter((f) => f.status === "pendente")
          .sort((a, b) => a.data_entrega.localeCompare(b.data_entrega))
          .slice(0, 5),
        user: { displayName: input.displayName, role: input.role, username: input.username },
      },
    };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : "Falha ao carregar o painel pessoal." };
  }
}

function normalizeStatus(value?: string): PersonalStatus {
  return value === "pendente" || value === "entregue" || value === "cancelado" || value === "atrasado" ? value : "todos";
}

function mapRows(rows: Array<Record<string, unknown>>): PersonalFicha[] {
  return rows.map((row) => ({
    id: String(row.id),
    cliente_nome_snapshot: String(row.cliente_nome_snapshot),
    created_at: String(row.created_at),
    data_entrega: String(row.data_entrega),
    delivered_at: row.delivered_at ? String(row.delivered_at) : null,
    status: row.status as PersonalFicha["status"],
    vendedor: row.vendedor ? String(row.vendedor) : null,
    pieces: Array.isArray(row.ficha_itens)
      ? row.ficha_itens.reduce((sum: number, item: { quantidade?: number | null }) => sum + (item.quantidade ?? 0), 0)
      : 0,
  }));
}

function buildSeries(rows: PersonalFicha[], since: string, today: string) {
  const buckets = new Map<string, number>();
  let cursor = since;
  while (cursor <= today) {
    buckets.set(cursor, 0);
    cursor = addDaysToInput(cursor, 1);
  }
  rows.forEach((row) => {
    const key = row.created_at.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });
  return Array.from(buckets, ([date, total]) => ({ date, total }));
}
