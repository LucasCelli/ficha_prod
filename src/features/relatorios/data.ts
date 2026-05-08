import { addDaysToInput, createUtcDateFromInput, formatDateInput, formatUtcDateInput, getBusinessTodayInput } from "@/lib/dates";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type RelatorioPeriodo = "ano" | "customizado" | "mes" | "ultimo_mes";

export type RelatorioFilters = {
  dataFim?: string;
  dataInicio?: string;
  evento?: boolean;
  periodo: RelatorioPeriodo;
  status?: Database["public"]["Enums"]["ficha_status"];
};

type FichaRow = Pick<
  Database["public"]["Tables"]["fichas"]["Row"],
  "id" | "cliente_nome_snapshot" | "data_inicio" | "data_entrega" | "material" | "status" | "arte" | "vendedor" | "evento"
>;

type FichaItemRow = Pick<Database["public"]["Tables"]["ficha_itens"]["Row"], "ficha_id" | "produto" | "quantidade" | "tamanho">;

type ClienteRow = Pick<Database["public"]["Tables"]["clientes"]["Row"], "primeira_ficha">;

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

export type RelatorioAtividade = {
  count: number;
  date: string;
  level: number;
};

export type RelatorioData = {
  atividade: RelatorioAtividade[];
  comparativo: {
    clientes: number;
    fichas: number;
    itens: number;
    taxaEntrega: number;
  };
  detalhes: RelatorioDetalhe[];
  filtros: RelatorioFilters;
  periodoLabel: string;
  personalizacoes: RelatorioRankItem[];
  resumo: {
    fichasEntregues: number;
    fichasPendentes: number;
    itensConfeccionados: number;
    novosClientes: number;
    taxaEntrega: number;
    topVendedor: string | null;
    topVendedorTotal: number;
    totalFichas: number;
  };
  rankings: {
    clientes: RelatorioRankItem[];
    materiais: RelatorioRankItem[];
    produtos: RelatorioRankItem[];
    tamanhos: RelatorioRankItem[];
    vendedores: RelatorioVendedor[];
  };
};

export type RelatorioResult =
  | {
      data: RelatorioData;
      kind: "ok";
    }
  | {
      data: null;
      kind: "not-configured";
    }
  | {
      data: null;
      kind: "error";
      message: string;
    };

const MAX_ROWS = 1200;

export async function getRelatorioData(filters: RelatorioFilters): Promise<RelatorioResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      data: null,
      kind: "not-configured",
    };
  }

  try {
    const range = getPeriodRange(filters);
    const previousRange = getPreviousPeriodRange(range);
    const activityRange = getActivityRange();
    const supabase = createServerSupabaseClient();

    const [fichasResult, clientesResult, previousFichasResult, previousClientesResult, activityFichasResult] = await Promise.all([
      fetchFichas(range, filters),
      supabase.from("clientes").select("primeira_ficha").gte("primeira_ficha", range.start).lte("primeira_ficha", range.end).limit(MAX_ROWS),
      fetchFichas(previousRange, filters),
      supabase
        .from("clientes")
        .select("primeira_ficha")
        .gte("primeira_ficha", previousRange.start)
        .lte("primeira_ficha", previousRange.end)
        .limit(MAX_ROWS),
      fetchFichas(activityRange),
    ]);

    const error =
      fichasResult.error ??
      clientesResult.error ??
      previousFichasResult.error ??
      previousClientesResult.error ??
      activityFichasResult.error;

    if (error) {
      return {
        data: null,
        kind: "error",
        message: error.message,
      };
    }

    const fichas = fichasResult.fichas;
    const previousFichas = previousFichasResult.fichas;
    const itens = await fetchItens(fichas.map((ficha) => ficha.id));
    const previousItens = await fetchItens(previousFichas.map((ficha) => ficha.id));

    if (itens.error ?? previousItens.error) {
      return {
        data: null,
        kind: "error",
        message: itens.error?.message ?? previousItens.error?.message ?? "Falha ao carregar itens do relatório.",
      };
    }

    const data = buildRelatorioData({
      clientes: clientesResult.data ?? [],
      filters: {
        ...filters,
        dataFim: range.end,
        dataInicio: range.start,
      },
      fichas,
      itens: itens.itens,
      previousClientes: previousClientesResult.data ?? [],
      previousFichas,
      previousItens: previousItens.itens,
      range,
      activityFichas: activityFichasResult.fichas,
      activityRange,
    });

    return {
      data,
      kind: "ok",
    };
  } catch (error) {
    return {
      data: null,
      kind: "error",
      message: error instanceof Error ? error.message : "Falha ao carregar relatório.",
    };
  }
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
  if (raw === "pendente" || raw === "entregue" || raw === "cancelado") return raw;
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

async function fetchFichas(range: { end: string; start: string }, filters: Pick<RelatorioFilters, "evento" | "status"> = {}) {
  let query = createServerSupabaseClient()
    .from("fichas")
    .select("id, cliente_nome_snapshot, data_inicio, data_entrega, material, status, arte, vendedor, evento")
    .gte("data_inicio", range.start)
    .lte("data_inicio", range.end)
    .order("data_inicio", { ascending: false })
    .limit(MAX_ROWS);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (typeof filters.evento === "boolean") {
    query = query.eq("evento", filters.evento);
  }

  const { data, error } = await query;

  return {
    error,
    fichas: data ?? [],
  };
}

async function fetchItens(fichaIds: string[]) {
  if (fichaIds.length === 0) {
    return {
      error: null,
      itens: [],
    };
  }

  const { data, error } = await createServerSupabaseClient()
    .from("ficha_itens")
    .select("ficha_id, produto, quantidade, tamanho")
    .in("ficha_id", fichaIds)
    .limit(MAX_ROWS * 8);

  return {
    error,
    itens: data ?? [],
  };
}

function buildRelatorioData(input: {
  activityFichas: FichaRow[];
  activityRange: { end: string; start: string };
  clientes: ClienteRow[];
  filters: RelatorioFilters;
  fichas: FichaRow[];
  itens: FichaItemRow[];
  previousClientes: ClienteRow[];
  previousFichas: FichaRow[];
  previousItens: FichaItemRow[];
  range: { end: string; start: string };
}): RelatorioData {
  const itensPorFicha = groupItensByFicha(input.itens);
  const totalFichas = input.fichas.length;
  const fichasEntregues = input.fichas.filter((ficha) => ficha.status === "entregue").length;
  const fichasPendentes = input.fichas.filter((ficha) => ficha.status === "pendente").length;
  const itensConfeccionados = sumItensForFichas(
    input.itens,
    new Set(input.fichas.filter((ficha) => ficha.status === "entregue").map((ficha) => ficha.id)),
  );
  const taxaEntrega = getPercent(fichasEntregues, fichasEntregues + fichasPendentes);
  const vendedores = buildVendedores(input.fichas, itensPorFicha);
  const topVendedor = vendedores[0] ?? null;

  return {
    atividade: buildActivity(input.activityFichas, input.activityRange),
    comparativo: {
      clientes: input.clientes.length - input.previousClientes.length,
      fichas: input.fichas.length - input.previousFichas.length,
      itens: sumItens(input.itens) - sumItens(input.previousItens),
      taxaEntrega: taxaEntrega - getPercent(
        input.previousFichas.filter((ficha) => ficha.status === "entregue").length,
        input.previousFichas.filter((ficha) => ficha.status === "entregue" || ficha.status === "pendente").length,
      ),
    },
    detalhes: input.fichas.map((ficha) => ({
      cliente: ficha.cliente_nome_snapshot,
      data: ficha.data_inicio,
      id: ficha.id,
      material: ficha.material ?? "Não especificado",
      quantidade: sumItens(itensPorFicha.get(ficha.id) ?? []),
      status: ficha.status,
      vendedor: ficha.vendedor ?? "Sem vendedor",
    })),
    filtros: input.filters,
    periodoLabel: formatPeriodLabel(input.filters.periodo, input.range),
    personalizacoes: buildRank(input.fichas, itensPorFicha, (ficha) => ficha.arte ?? "Sem tipo definido"),
    rankings: {
      clientes: buildRank(input.fichas, itensPorFicha, (ficha) => ficha.cliente_nome_snapshot),
      materiais: buildRank(input.fichas, itensPorFicha, (ficha) => ficha.material ?? "Não especificado"),
      produtos: buildItemRank(input.itens, (item) => item.produto ?? "Não especificado"),
      tamanhos: buildItemRank(input.itens, (item) => item.tamanho ?? "Sem tamanho"),
      vendedores,
    },
    resumo: {
      fichasEntregues,
      fichasPendentes,
      itensConfeccionados,
      novosClientes: input.clientes.length,
      taxaEntrega,
      topVendedor: topVendedor?.label ?? null,
      topVendedorTotal: topVendedor?.totalFichas ?? 0,
      totalFichas,
    },
  };
}

function buildActivity(fichas: FichaRow[], range: { end: string; start: string }): RelatorioAtividade[] {
  const counts = new Map<string, number>();

  for (const ficha of fichas) {
    if (!ficha.data_inicio) continue;
    counts.set(ficha.data_inicio, (counts.get(ficha.data_inicio) ?? 0) + 1);
  }

  const max = Math.max(...counts.values(), 1);
  const days: RelatorioAtividade[] = [];
  let cursor = range.start;

  while (cursor <= range.end) {
    const count = counts.get(cursor) ?? 0;
    days.push({
      count,
      date: cursor,
      level: count === 0 ? 0 : Math.max(1, Math.ceil((count / max) * 4)),
    });
    cursor = addDays(cursor, 1);
  }

  return days;
}

function buildVendedores(fichas: FichaRow[], itensPorFicha: Map<string, FichaItemRow[]>): RelatorioVendedor[] {
  const grouped = new Map<string, FichaRow[]>();

  for (const ficha of fichas) {
    const label = ficha.vendedor?.trim() || "Sem vendedor";
    grouped.set(label, [...(grouped.get(label) ?? []), ficha]);
  }

  const maxFichas = Math.max(...Array.from(grouped.values()).map((group) => group.length), 1);

  return Array.from(grouped.entries())
    .map(([label, group]) => ({
      entregues: group.filter((ficha) => ficha.status === "entregue").length,
      label,
      pendentes: group.filter((ficha) => ficha.status === "pendente").length,
      percent: Math.round((group.length / maxFichas) * 100),
      totalFichas: group.length,
      totalItens: sumItensForFichas(itensPorFicha, new Set(group.map((ficha) => ficha.id))),
    }))
    .sort((a, b) => b.totalFichas - a.totalFichas || a.label.localeCompare(b.label, "pt-BR"));
}

function buildRank(fichas: FichaRow[], itensPorFicha: Map<string, FichaItemRow[]>, getLabel: (ficha: FichaRow) => string) {
  const grouped = new Map<string, FichaRow[]>();

  for (const ficha of fichas) {
    const label = getLabel(ficha).replaceAll("_", " ").trim() || "Não especificado";
    grouped.set(label, [...(grouped.get(label) ?? []), ficha]);
  }

  const maxItens = Math.max(...Array.from(grouped.values()).map((group) => sumItensForFichas(itensPorFicha, new Set(group.map((ficha) => ficha.id)))), 1);

  return Array.from(grouped.entries())
    .map(([label, group]) => {
      const totalItens = sumItensForFichas(itensPorFicha, new Set(group.map((ficha) => ficha.id)));
      return {
        label,
        percent: Math.round((totalItens / maxItens) * 100),
        totalFichas: group.length,
        totalItens,
      };
    })
    .sort((a, b) => b.totalItens - a.totalItens || b.totalFichas - a.totalFichas || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, 12);
}

function buildItemRank(itens: FichaItemRow[], getLabel: (item: FichaItemRow) => string) {
  const grouped = new Map<string, FichaItemRow[]>();

  for (const item of itens) {
    const label = getLabel(item).trim() || "Não especificado";
    grouped.set(label, [...(grouped.get(label) ?? []), item]);
  }

  const maxItens = Math.max(...Array.from(grouped.values()).map(sumItens), 1);

  return Array.from(grouped.entries())
    .map(([label, group]) => ({
      label,
      percent: Math.round((sumItens(group) / maxItens) * 100),
      totalFichas: new Set(group.map((item) => item.ficha_id)).size,
      totalItens: sumItens(group),
    }))
    .sort((a, b) => b.totalItens - a.totalItens || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, 12);
}

function groupItensByFicha(itens: FichaItemRow[]) {
  const grouped = new Map<string, FichaItemRow[]>();

  for (const item of itens) {
    grouped.set(item.ficha_id, [...(grouped.get(item.ficha_id) ?? []), item]);
  }

  return grouped;
}

function sumItens(input: FichaItemRow[]) {
  return input.reduce((total, item) => total + (Number(item.quantidade) || 0), 0);
}

function sumItensForFichas(input: FichaItemRow[] | Map<string, FichaItemRow[]>, fichaIds: Set<string>) {
  if (input instanceof Map) {
    return Array.from(fichaIds).reduce((total, fichaId) => total + sumItens(input.get(fichaId) ?? []), 0);
  }

  return input.reduce((total, item) => total + (fichaIds.has(item.ficha_id) ? Number(item.quantidade) || 0 : 0), 0);
}

function getPercent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function getPeriodRange(filters: RelatorioFilters) {
  const today = getBusinessTodayInput();
  const current = createDateFromInput(today);

  if (filters.periodo === "ano") {
    return {
      end: `${current.getUTCFullYear()}-12-31`,
      start: `${current.getUTCFullYear()}-01-01`,
    };
  }

  if (filters.periodo === "ultimo_mes") {
    const previous = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1));
    return monthRange(previous);
  }

  if (filters.periodo === "customizado" && filters.dataInicio && filters.dataFim) {
    return {
      end: filters.dataFim,
      start: filters.dataInicio,
    };
  }

  return monthRange(current);
}

function getPreviousPeriodRange(range: { end: string; start: string }) {
  const start = createDateFromInput(range.start);
  const end = createDateFromInput(range.end);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const previousEnd = addDays(range.start, -1);
  const previousStart = addDays(previousEnd, -(days - 1));

  return {
    end: previousEnd,
    start: previousStart,
  };
}

function getActivityRange() {
  const today = getBusinessTodayInput();
  return {
    end: today,
    start: addDays(today, -364),
  };
}

function monthRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));

  return {
    end: formatUtcDateInput(end),
    start: formatUtcDateInput(start),
  };
}

function formatPeriodLabel(periodo: RelatorioPeriodo, range: { end: string; start: string }) {
  if (periodo === "mes") return "Este mês";
  if (periodo === "ultimo_mes") return "Último mês";
  if (periodo === "ano") return "Este ano";
  return `${formatDate(range.start)} até ${formatDate(range.end)}`;
}

function addDays(value: string, amount: number) {
  return addDaysToInput(value, amount);
}

function createDateFromInput(value: string) {
  return createUtcDateFromInput(value);
}

function formatDate(value: string) {
  return formatDateInput(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
