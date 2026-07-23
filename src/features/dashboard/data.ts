import { addDaysToInput, getBusinessTodayInput } from "@/lib/dates";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type DashboardMetrics = {
  atrasadas: number;
  clientes: number;
  entregues: number;
  fichas: number;
  pendentes: number;
};

export type DashboardWeekPoint = {
  criadas: number;
  dateInput: string;
  entregues: number;
  isToday: boolean;
  label: string;
  pendentes: number;
};

export type DashboardUpcoming = Pick<
  Database["public"]["Tables"]["fichas"]["Row"],
  "id" | "cliente_nome_snapshot" | "data_entrega" | "status" | "arte"
>;

export type DashboardRecent = DashboardUpcoming;

export type DashboardData = {
  deliveryCounts: Record<string, number>;
  metrics: DashboardMetrics;
  recentFichas: DashboardRecent[];
  today: string;
  upcoming: DashboardUpcoming[];
  weekSeries: DashboardWeekPoint[];
};

export type DashboardResult =
  | { data: DashboardData; kind: "ok" }
  | { kind: "not-configured" }
  | { kind: "error"; message: string };

const WEEK_DAYS = 7;
const CALENDAR_PAST_DAYS = 45;
const CALENDAR_FUTURE_DAYS = 75;
const UPCOMING_LIMIT = 6;

export async function getDashboardData(): Promise<DashboardResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    return { kind: "not-configured" };
  }

  try {
    const supabase = createServerSupabaseClient();
    const today = getBusinessTodayInput();
    const weekStart = addDaysToInput(today, -(WEEK_DAYS - 1));
    const calendarStart = addDaysToInput(today, -CALENDAR_PAST_DAYS);
    const calendarEnd = addDaysToInput(today, CALENDAR_FUTURE_DAYS);
    // Extra slack so timezone bucketing never drops early/late business-day rows.
    const createdSince = `${addDaysToInput(weekStart, -1)}T00:00:00.000Z`;

    const [
      fichasResult,
      pendentesResult,
      entreguesResult,
      atrasadasResult,
      clientesResult,
      recentResult,
      weekResult,
      calendarResult,
      upcomingResult,
    ] = await Promise.all([
      supabase.from("fichas").select("id", { count: "exact", head: true }),
      supabase.from("fichas").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      supabase.from("fichas").select("id", { count: "exact", head: true }).eq("status", "entregue"),
      supabase.from("fichas").select("id", { count: "exact", head: true }).neq("status", "entregue").lt("data_entrega", today),
      supabase.from("clientes").select("id", { count: "exact", head: true }),
      supabase
        .from("fichas")
        .select("id, cliente_nome_snapshot, data_entrega, status, arte")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("fichas").select("created_at, status").gte("created_at", createdSince),
      supabase
        .from("fichas")
        .select("data_entrega")
        .neq("status", "entregue")
        .gte("data_entrega", calendarStart)
        .lte("data_entrega", calendarEnd),
      supabase
        .from("fichas")
        .select("id, cliente_nome_snapshot, data_entrega, status, arte")
        .neq("status", "entregue")
        .gte("data_entrega", today)
        .order("data_entrega", { ascending: true })
        .limit(UPCOMING_LIMIT),
    ]);

    const error =
      fichasResult.error ??
      pendentesResult.error ??
      entreguesResult.error ??
      atrasadasResult.error ??
      clientesResult.error ??
      recentResult.error ??
      weekResult.error ??
      calendarResult.error ??
      upcomingResult.error;

    if (error) {
      return { kind: "error", message: error.message };
    }

    return {
      kind: "ok",
      data: {
        deliveryCounts: buildDeliveryCounts(calendarResult.data ?? []),
        metrics: {
          atrasadas: atrasadasResult.count ?? 0,
          clientes: clientesResult.count ?? 0,
          entregues: entreguesResult.count ?? 0,
          fichas: fichasResult.count ?? 0,
          pendentes: pendentesResult.count ?? 0,
        },
        recentFichas: recentResult.data ?? [],
        today,
        upcoming: upcomingResult.data ?? [],
        weekSeries: buildWeekSeries(weekResult.data ?? [], weekStart, today),
      },
    };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Falha ao carregar a visão geral.",
    };
  }
}

function buildDeliveryCounts(rows: { data_entrega: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const row of rows) {
    if (!row.data_entrega) continue;
    counts[row.data_entrega] = (counts[row.data_entrega] ?? 0) + 1;
  }

  return counts;
}

function buildWeekSeries(
  rows: { created_at: string; status: Database["public"]["Enums"]["ficha_status"] }[],
  weekStart: string,
  today: string,
): DashboardWeekPoint[] {
  const buckets = new Map<string, { criadas: number; entregues: number; pendentes: number }>();

  for (let offset = 0; offset < WEEK_DAYS; offset += 1) {
    buckets.set(addDaysToInput(weekStart, offset), { criadas: 0, entregues: 0, pendentes: 0 });
  }

  for (const row of rows) {
    const dateInput = getBusinessTodayInput(new Date(row.created_at));
    const bucket = buckets.get(dateInput);
    if (!bucket) continue;

    bucket.criadas += 1;
    if (row.status === "entregue") bucket.entregues += 1;
    else if (row.status === "pendente") bucket.pendentes += 1;
  }

  return Array.from(buckets.entries()).map(([dateInput, value]) => ({
    ...value,
    dateInput,
    isToday: dateInput === today,
    label: formatWeekdayLabel(dateInput),
  }));
}

function formatWeekdayLabel(dateInput: string) {
  const date = new Date(`${dateInput}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" })
    .format(date)
    .replace(".", "");
  const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "UTC" }).format(date);

  return `${weekday.charAt(0).toLocaleUpperCase("pt-BR")}${weekday.slice(1)} ${day}`;
}
