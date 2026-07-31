import { getServerErrorMessage } from "@/lib/server/boundaries";
import { addDaysToInput, createUtcDateFromInput, formatDateInput, formatUtcDateInput, getBusinessTodayInput } from "@/lib/dates";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type RelatorioPeriodo = "ano" | "customizado" | "mes" | "ultimo_mes";
export type RelatorioGranularidade = "dia" | "mes" | "semana";

export type RelatorioFilters = {
  dataFim?: string;
  dataInicio?: string;
  evento?: boolean;
  periodo: RelatorioPeriodo;
  status?: Database["public"]["Enums"]["ficha_status"];
};

export type RelatorioRankItem = {
  label: string;
  percent: number;
  totalFichas: number;
  totalItens: number;
};

export type RelatorioVendedor = RelatorioRankItem & {
  entregues: number;
  pendentes: number;
};

export type RelatorioDetalhe = {
  cliente: string;
  data: string | null;
  id: string;
  material: string;
  quantidade: number;
  status: string;
  vendedor: string;
};

export type RelatorioTrendPoint = {
  bucket: string;
  label: string;
  criadas: number;
  entregues: number;
  pendentes: number;
  itens: number;
};

export type RelatorioStatusFatia = {
  status: Database["public"]["Enums"]["ficha_status"];
  label: string;
  value: number;
  percent: number;
};

export type RelatorioComparativoTotais = {
  clientes: number;
  fichas: number;
  itens: number;
  taxaEntrega: number;
};

export type RelatorioData = {
  comparativo: RelatorioComparativoTotais;
  comparativoAnterior: RelatorioComparativoTotais;
  comparativoAtual: RelatorioComparativoTotais;
  detalhes: RelatorioDetalhe[];
  eventos: { avulsos: number; eventos: number };
  filtros: RelatorioFilters;
  granularidade: RelatorioGranularidade;
  periodoLabel: string;
  personalizacoes: RelatorioRankItem[];
  resumo: {
    entregasAnoAtual: number;
    entregasRecorteAnterior: number;
    fichasEntregues: number;
    fichasPendentes: number;
    itensConfeccionados: number;
    itensPorFicha: number;
    novosClientes: number;
    prazoMedioEntrega: number | null;
    taxaEntrega: number;
    totalFichas: number;
    totalItens: number;
  };
  rankings: {
    clientes: RelatorioRankItem[];
    materiais: RelatorioRankItem[];
    produtos: RelatorioRankItem[];
    tamanhos: RelatorioRankItem[];
    vendedores: RelatorioVendedor[];
  };
  statusDistribuicao: RelatorioStatusFatia[];
  tendencia: RelatorioTrendPoint[];
};

export type RelatorioResult =
  | { data: RelatorioData; kind: "ok" }
  | { data: null; kind: "not-configured" }
  | { data: null; kind: "error"; message: string };

type AggregateTotals = {
  clientes: number;
  entregues: number;
  fichas: number;
  itens: number;
  itensConfeccionados?: number;
  pendentes: number;
  prazoMedioEntrega?: number | null;
};

type RankRow = {
  label: string;
  total_fichas: number;
  total_itens: number;
};

type SellerRankRow = RankRow & { entregues: number; pendentes: number };

type ReportSummary = {
  current: AggregateTotals;
  deliveryYearCount: number;
  events: { avulsos: number; eventos: number };
  previous: AggregateTotals;
  rankings: {
    clientes: RankRow[];
    materiais: RankRow[];
    personalizacoes: RankRow[];
    produtos: RankRow[];
    tamanhos: RankRow[];
    vendedores: SellerRankRow[];
  };
  trend: Array<{ criadas: number; date: string; entregues: number; itens: number; pendentes: number }>;
};

type ReportDetailRow = {
  cliente: string;
  data: string | null;
  id: string;
  material: string;
  quantidade: number;
  status: Database["public"]["Enums"]["ficha_status"];
  total_count: number;
  vendedor: string;
};

const DETAIL_PAGE_SIZE = 1_000;
const STATUS_LABELS: Record<Database["public"]["Enums"]["ficha_status"], string> = {
  entregue: "Entregues",
  pendente: "Pendentes",
};

export async function getRelatorioData(filters: RelatorioFilters): Promise<RelatorioResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) return { data: null, kind: "not-configured" };

  try {
    const range = getPeriodRange(filters);
    const previousRange = getPreviousPeriodRange(range);
    const deliveryYearRange = getYearToDateRange();
    const supabase = createServerSupabaseClient();
    const summaryResult = await withRetry(() =>
      supabase.rpc("get_report_summary", {
        p_delivery_year_end: deliveryYearRange.end,
        p_delivery_year_start: deliveryYearRange.start,
        p_end: range.end,
        p_evento: filters.evento ?? null,
        p_previous_end: previousRange.end,
        p_previous_start: previousRange.start,
        p_start: range.start,
        p_status: filters.status ?? null,
      }),
    );

    if (summaryResult.error || !summaryResult.data) {
      return {
        data: null,
        kind: "error",
        message: getServerErrorMessage(
          "relatorios.summary",
          summaryResult.error ?? new Error("Missing report summary"),
          "Não foi possível carregar o relatório.",
        ),
      };
    }

    const summary = summaryResult.data as unknown as ReportSummary;

    return {
      data: buildReportData(summary, [], {
        ...filters,
        dataFim: range.end,
        dataInicio: range.start,
      }, range),
      kind: "ok",
    };
  } catch (error) {
    return { data: null, kind: "error", message: getServerErrorMessage("relatorios.load", error, "Não foi possível carregar o relatório.") };
  }
}

export async function* iterateRelatorioDetalhes(filters: RelatorioFilters): AsyncGenerator<RelatorioDetalhe[]> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    throw new Error("Supabase server configuration is unavailable.");
  }

  const range = getPeriodRange(filters);
  const supabase = createServerSupabaseClient();

  for (let offset = 0; ; offset += DETAIL_PAGE_SIZE) {
    const result = await withRetry(() =>
      supabase.rpc("get_report_details_page", {
        p_end: range.end,
        p_evento: filters.evento ?? null,
        p_limit: DETAIL_PAGE_SIZE,
        p_offset: offset,
        p_start: range.start,
        p_status: filters.status ?? null,
      }),
    );

    if (result.error) throw result.error;
    const page = (result.data ?? []) as ReportDetailRow[];
    const total = Number(page[0]?.total_count ?? offset + page.length);

    yield page.map(({ total_count, ...row }) => {
      void total_count;
      return { ...row, quantidade: Number(row.quantidade) };
    });

    if (offset + page.length >= total || page.length < DETAIL_PAGE_SIZE) break;
  }
}
function buildReportData(
  summary: ReportSummary,
  detalhes: RelatorioDetalhe[],
  filters: RelatorioFilters,
  range: { end: string; start: string },
): RelatorioData {
  const current = normalizeTotals(summary.current);
  const previous = normalizeTotals(summary.previous);
  const taxaEntrega = getPercent(current.entregues, current.entregues + current.pendentes);
  const previousTaxaEntrega = getPercent(previous.entregues, previous.entregues + previous.pendentes);
  const comparativoAtual = toComparativo(current, taxaEntrega);
  const comparativoAnterior = toComparativo(previous, previousTaxaEntrega);

  return {
    comparativo: {
      clientes: comparativoAtual.clientes - comparativoAnterior.clientes,
      fichas: comparativoAtual.fichas - comparativoAnterior.fichas,
      itens: comparativoAtual.itens - comparativoAnterior.itens,
      taxaEntrega: comparativoAtual.taxaEntrega - comparativoAnterior.taxaEntrega,
    },
    comparativoAnterior,
    comparativoAtual,
    detalhes,
    eventos: {
      avulsos: Number(summary.events.avulsos),
      eventos: Number(summary.events.eventos),
    },
    filtros: filters,
    granularidade: getGranularidade(range),
    periodoLabel: formatPeriodLabel(filters.periodo, range),
    personalizacoes: mapRanks(summary.rankings.personalizacoes, formatPersonalizacaoLabel),
    rankings: {
      clientes: mapRanks(summary.rankings.clientes),
      materiais: mapRanks(summary.rankings.materiais),
      produtos: mapRanks(summary.rankings.produtos),
      tamanhos: mapRanks(summary.rankings.tamanhos),
      vendedores: mapSellers(summary.rankings.vendedores),
    },
    resumo: {
      entregasAnoAtual: Number(summary.deliveryYearCount),
      entregasRecorteAnterior: previous.entregues,
      fichasEntregues: current.entregues,
      fichasPendentes: current.pendentes,
      itensConfeccionados: Number(summary.current.itensConfeccionados ?? 0),
      itensPorFicha: current.fichas > 0 ? Math.round((current.itens / current.fichas) * 10) / 10 : 0,
      novosClientes: current.clientes,
      prazoMedioEntrega: summary.current.prazoMedioEntrega === null || summary.current.prazoMedioEntrega === undefined
        ? null
        : Math.round(Number(summary.current.prazoMedioEntrega) * 10) / 10,
      taxaEntrega,
      totalFichas: current.fichas,
      totalItens: current.itens,
    },
    statusDistribuicao: buildStatusDistribution(current.entregues, current.pendentes),
    tendencia: buildTrend(summary.trend, range),
  };
}

function normalizeTotals(value: AggregateTotals) {
  return {
    clientes: Number(value.clientes),
    entregues: Number(value.entregues),
    fichas: Number(value.fichas),
    itens: Number(value.itens),
    pendentes: Number(value.pendentes),
  };
}

function toComparativo(value: ReturnType<typeof normalizeTotals>, taxaEntrega: number): RelatorioComparativoTotais {
  return { clientes: value.clientes, fichas: value.fichas, itens: value.itens, taxaEntrega };
}

function mapRanks(rows: RankRow[] = [], formatLabel: (value: string) => string = normalizeRankLabel): RelatorioRankItem[] {
  const normalized = rows.map((row) => ({
    label: formatLabel(row.label),
    totalFichas: Number(row.total_fichas),
    totalItens: Number(row.total_itens),
  }));
  const maxItens = Math.max(1, ...normalized.map((row) => row.totalItens));
  return normalized.map((row) => ({ ...row, percent: Math.round((row.totalItens / maxItens) * 100) }));
}

function mapSellers(rows: SellerRankRow[] = []): RelatorioVendedor[] {
  const maxFichas = Math.max(1, ...rows.map((row) => Number(row.total_fichas)));
  return rows.map((row) => ({
    entregues: Number(row.entregues),
    label: normalizeRankLabel(row.label),
    pendentes: Number(row.pendentes),
    percent: Math.round((Number(row.total_fichas) / maxFichas) * 100),
    totalFichas: Number(row.total_fichas),
    totalItens: Number(row.total_itens),
  }));
}

function buildStatusDistribution(entregues: number, pendentes: number): RelatorioStatusFatia[] {
  const total = entregues + pendentes;
  return ([{ status: "entregue", value: entregues }, { status: "pendente", value: pendentes }] as const)
    .filter((slice) => slice.value > 0)
    .map((slice) => ({
      label: STATUS_LABELS[slice.status],
      percent: getPercent(slice.value, total),
      status: slice.status,
      value: slice.value,
    }));
}

function buildTrend(rows: ReportSummary["trend"], range: { end: string; start: string }) {
  const granularity = getGranularidade(range);
  const buckets = new Map<string, RelatorioTrendPoint>();
  for (const bucket of getBucketKeys(range, granularity)) {
    buckets.set(bucket, { bucket, criadas: 0, entregues: 0, itens: 0, label: formatBucketLabel(bucket, granularity), pendentes: 0 });
  }

  for (const row of rows ?? []) {
    const bucket = buckets.get(getBucketKey(row.date, granularity));
    if (!bucket) continue;
    bucket.criadas += Number(row.criadas);
    bucket.entregues += Number(row.entregues);
    bucket.itens += Number(row.itens);
    bucket.pendentes += Number(row.pendentes);
  }
  return Array.from(buckets.values());
}

export function normalizeRelatorioPeriodo(value: string | string[] | undefined): RelatorioPeriodo {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "ano" || raw === "customizado" || raw === "ultimo_mes") return raw;
  return "mes";
}

export function normalizeRelatorioDate(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  return raw;
}

export function normalizeRelatorioStatus(value: string | string[] | undefined): RelatorioFilters["status"] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "pendente" || raw === "entregue") return raw;
  return undefined;
}

export function normalizeRelatorioEvento(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

export function buildRelatorioSearchParams(filters: RelatorioFilters) {
  const params = new URLSearchParams();
  params.set("periodo", filters.periodo);
  if (filters.dataInicio) params.set("dataInicio", filters.dataInicio);
  if (filters.dataFim) params.set("dataFim", filters.dataFim);
  if (typeof filters.evento === "boolean") params.set("evento", String(filters.evento));
  if (filters.status) params.set("status", filters.status);
  return params;
}

async function withRetry<T>(run: () => PromiseLike<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
  throw lastError;
}

function normalizeRankLabel(value: string) {
  return value.replaceAll("_", " ").trim() || "Não especificado";
}

function formatPersonalizacaoLabel(value: string) {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  if (!normalized || normalized === "sem personalizacao") return "Sem Personalização";
  const labels: Record<string, string> = {
    bordado: "Bordado",
    dtf: "DTF",
    "dtf textil": "DTF Têxtil",
    serigrafia: "Serigrafia",
    silk: "Silk",
    "silk screen": "Silk Screen",
    sublimacao: "Sublimação",
    "sublimação": "Sublimação",
  };
  return labels[normalized] ?? normalized.replace(/\p{L}[\p{L}\p{M}]*/gu, (word) => word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1));
}

function getPercent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function getGranularidade(range: { end: string; start: string }): RelatorioGranularidade {
  const days = getRangeSpanDays(range);
  if (days <= 62) return "dia";
  if (days <= 215) return "semana";
  return "mes";
}

function getBucketKeys(range: { end: string; start: string }, granularidade: RelatorioGranularidade) {
  const keys: string[] = [];
  const seen = new Set<string>();
  let cursor = getBucketKey(range.start, granularidade);
  const lastKey = getBucketKey(range.end, granularidade);
  for (let guard = 0; guard < 800; guard += 1) {
    if (!seen.has(cursor)) { seen.add(cursor); keys.push(cursor); }
    if (cursor >= lastKey) break;
    cursor = advanceBucket(cursor, granularidade);
  }
  return keys;
}

function getBucketKey(value: string, granularidade: RelatorioGranularidade) {
  if (granularidade === "dia") return value;
  if (granularidade === "semana") return startOfWeek(value);
  return `${value.slice(0, 7)}-01`;
}

function advanceBucket(value: string, granularidade: RelatorioGranularidade) {
  if (granularidade === "dia") return addDaysToInput(value, 1);
  if (granularidade === "semana") return addDaysToInput(value, 7);
  const date = createUtcDateFromInput(value);
  return formatUtcDateInput(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)));
}

function formatBucketLabel(value: string, granularidade: RelatorioGranularidade) {
  if (granularidade === "mes") {
    const label = formatDateInput(value, { month: "short", year: "2-digit" }).replace(".", "");
    return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
  }
  return formatDateInput(value, { day: "2-digit", month: "2-digit" });
}

function startOfWeek(value: string) {
  const date = createUtcDateFromInput(value);
  const day = date.getUTCDay();
  return addDaysToInput(value, day === 0 ? -6 : 1 - day);
}

function getRangeSpanDays(range: { end: string; start: string }) {
  return Math.max(1, Math.round((createUtcDateFromInput(range.end).getTime() - createUtcDateFromInput(range.start).getTime()) / 86_400_000) + 1);
}

function getPeriodRange(filters: RelatorioFilters) {
  const today = getBusinessTodayInput();
  const current = createUtcDateFromInput(today);
  if (filters.periodo === "ano") return { end: `${current.getUTCFullYear()}-12-31`, start: `${current.getUTCFullYear()}-01-01` };
  if (filters.periodo === "ultimo_mes") return monthRange(new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1)));
  if (filters.periodo === "customizado" && filters.dataInicio && filters.dataFim) return { end: filters.dataFim, start: filters.dataInicio };
  return monthRange(current);
}

function getPreviousPeriodRange(range: { end: string; start: string }) {
  const days = getRangeSpanDays(range);
  const end = addDaysToInput(range.start, -1);
  return { end, start: addDaysToInput(end, -(days - 1)) };
}

function getYearToDateRange() {
  const today = getBusinessTodayInput();
  return { end: today, start: `${today.slice(0, 4)}-01-01` };
}

function monthRange(date: Date) {
  return {
    end: formatUtcDateInput(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))),
    start: formatUtcDateInput(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))),
  };
}

function formatPeriodLabel(periodo: RelatorioPeriodo, range: { end: string; start: string }) {
  if (periodo === "mes") return "Este mês";
  if (periodo === "ultimo_mes") return "Último mês";
  if (periodo === "ano") return "Este ano";
  return `${formatDateInput(range.start)} até ${formatDateInput(range.end)}`;
}