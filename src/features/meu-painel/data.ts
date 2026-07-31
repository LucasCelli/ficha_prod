import "server-only";

import { getServerErrorMessage } from "@/lib/server/boundaries";

import { addDaysToInput, addMonthsToInput, getBusinessTodayInput } from "@/lib/dates";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { calculateComparison, normalizePersonalStatus } from "./analytics";

type FichaStatus = Database["public"]["Enums"]["ficha_status"];

export type PersonalFicha = {
  arte: string | null;
  cliente_nome_snapshot: string;
  created_at: string;
  data_entrega: string;
  delivered_at: string | null;
  id: string;
  imageUrl: string | null;
  numero_venda: string | null;
  pieces: number;
  status: FichaStatus;
  updated_at: string;
  vendedor: string | null;
};

export type PersonalFichaLink = Pick<PersonalFicha, "cliente_nome_snapshot" | "data_entrega" | "id">;

export type PersonalDashboardData = {
  allTimeTotal: number;
  averageLeadDays: number | null;
  comparison: number | null;
  idle: PersonalFichaLink[];
  lastLoginAt: string | null;
  metrics: { atrasadas: number; entregues: number; fichas: number; noPrazo: number; pendentes: number; pieces: number };
  page: number;
  pageSize: number;
  recent: PersonalFicha[];
  series: { date: string; total: number }[];
  total: number;
  upcoming: PersonalFichaLink[];
  user: { displayName: string; role: string; username: string };
};

export type PersonalDashboardResult =
  | { kind: "ok"; data: PersonalDashboardData }
  | { kind: "not-configured" }
  | { kind: "error"; message: string };

type PersonalSummary = {
  allTimeTotal: number;
  averageLeadDays: number | null;
  currentCount: number;
  idle: PersonalFichaLink[];
  lastLoginAt: string | null;
  metrics: PersonalDashboardData["metrics"];
  previousCount: number;
  series: Array<{ date: string; total: number }>;
  upcoming: PersonalFichaLink[];
};

type PersonalFichaPageRow = {
  arte: string | null;
  cliente_nome_snapshot: string;
  created_at: string;
  data_entrega: string;
  delivered_at: string | null;
  id: string;
  image_url: string | null;
  numero_venda: string | null;
  pieces: number;
  status: FichaStatus;
  total_count: number;
  updated_at: string;
  vendedor: string | null;
};

const PAGE_SIZE = 20;

export async function getPersonalDashboardData(input: {
  busca?: string;
  displayName: string;
  page?: number;
  period?: string;
  role: string;
  status?: string;
  userId: string;
  username: string;
}): Promise<PersonalDashboardResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) return { kind: "not-configured" };

  try {
    const today = getBusinessTodayInput();
    const { previousSince, since } = getPeriodBoundaries(input.period, today);
    const page = Math.max(1, input.page ?? 1);
    const status = normalizePersonalStatus(input.status);
    const supabase = createServerSupabaseClient();

    const [summaryResult, pageResult] = await Promise.all([
      supabase.rpc("get_personal_dashboard_summary", {
        p_previous_since: previousSince,
        p_since: since,
        p_today: today,
        p_user_id: input.userId,
      }),
      supabase.rpc("get_personal_fichas_page", {
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
        p_search: input.busca?.trim() ?? "",
        p_status: status,
        p_today: today,
        p_user_id: input.userId,
      }),
    ]);

    const error = summaryResult.error ?? pageResult.error;
    if (error) return { kind: "error", message: getServerErrorMessage("meu-painel.load", error, "Não foi possível carregar o painel pessoal.") };

    const summary = summaryResult.data as PersonalSummary;
    const rows = (pageResult.data ?? []) as PersonalFichaPageRow[];
    const recent = rows.map(mapPersonalFicha);
    const total = Number(rows[0]?.total_count ?? 0);
    const isAllTime = input.period === "total";
    const seriesStart = isAllTime ? summary.series[0]?.date ?? today : since ?? today;

    return {
      kind: "ok",
      data: {
        allTimeTotal: Number(summary.allTimeTotal),
        averageLeadDays: summary.averageLeadDays === null ? null : Number(summary.averageLeadDays),
        comparison: isAllTime ? null : calculateComparison(Number(summary.currentCount), Number(summary.previousCount)),
        idle: summary.idle ?? [],
        lastLoginAt: summary.lastLoginAt,
        metrics: normalizeMetrics(summary.metrics),
        page,
        pageSize: PAGE_SIZE,
        recent,
        series: fillSeries(summary.series ?? [], seriesStart, today),
        total,
        upcoming: summary.upcoming ?? [],
        user: { displayName: input.displayName, role: input.role, username: input.username },
      },
    };
  } catch (error) {
    return { kind: "error", message: getServerErrorMessage("meu-painel.load", error, "Não foi possível carregar o painel pessoal.") };
  }
}

function getPeriodBoundaries(period: string | undefined, today: string) {
  if (period === "total") return { previousSince: today, since: null };

  const selectedDays = period === "7" || period === "90" ? Number(period) : null;
  if (selectedDays) {
    const since = addDaysToInput(today, -(selectedDays - 1));
    return { previousSince: addDaysToInput(since, -selectedDays), since };
  }

  const since = `${today.slice(0, 7)}-01`;
  return { previousSince: addMonthsToInput(since, -1), since };
}

function mapPersonalFicha(row: PersonalFichaPageRow): PersonalFicha {
  return {
    arte: row.arte,
    cliente_nome_snapshot: row.cliente_nome_snapshot,
    created_at: row.created_at,
    data_entrega: row.data_entrega,
    delivered_at: row.delivered_at,
    id: row.id,
    imageUrl: row.image_url,
    numero_venda: row.numero_venda,
    pieces: Number(row.pieces),
    status: row.status,
    updated_at: row.updated_at,
    vendedor: row.vendedor,
  };
}

function normalizeMetrics(metrics: PersonalDashboardData["metrics"]): PersonalDashboardData["metrics"] {
  return {
    atrasadas: Number(metrics.atrasadas),
    entregues: Number(metrics.entregues),
    fichas: Number(metrics.fichas),
    noPrazo: Number(metrics.noPrazo),
    pendentes: Number(metrics.pendentes),
    pieces: Number(metrics.pieces),
  };
}

function fillSeries(rows: Array<{ date: string; total: number }>, since: string, today: string) {
  const totals = new Map(rows.map((row) => [row.date, Number(row.total)]));
  const series: Array<{ date: string; total: number }> = [];

  for (let cursor = since; cursor <= today; cursor = addDaysToInput(cursor, 1)) {
    series.push({ date: cursor, total: totals.get(cursor) ?? 0 });
  }

  return series;
}