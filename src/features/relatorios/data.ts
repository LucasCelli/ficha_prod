import { addDaysToInput, createUtcDateFromInput, formatDateInput, formatUtcDateInput, getBusinessTodayInput } from "@/lib/dates";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>;

export type RelatorioPeriodo = "ano" | "customizado" | "mes" | "ultimo_mes";

export type RelatorioGranularidade = "dia" | "mes" | "semana";

export type RelatorioFilters = {
  dataFim?: string;
  dataInicio?: string;
  evento?: boolean;
  periodo: RelatorioPeriodo;
  status?: Database["public"]["Enums"]["ficha_status"];
};

type FichaRow = Pick<
  Database["public"]["Tables"]["fichas"]["Row"],
  "id" | "cliente_nome_snapshot" | "data_inicio" | "data_entrega" | "delivered_at" | "material" | "status" | "arte" | "vendedor" | "evento"
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
  comparativo: {
    clientes: number;
    fichas: number;
    itens: number;
    taxaEntrega: number;
  };
  comparativoAnterior: RelatorioComparativoTotais;
  comparativoAtual: RelatorioComparativoTotais;
  detalhes: RelatorioDetalhe[];
  eventos: {
    avulsos: number;
    eventos: number;
  };
  filtros: RelatorioFilters;
  granularidade: RelatorioGranularidade;
  periodoLabel: string;
  personalizacoes: RelatorioRankItem[];
  resumo: {
    entregasAnoAtual: number;
    entregasRecorteAnterior: number;
    fichasCanceladas: number;
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
const ITENS_CHUNK_SIZE = 150;

const STATUS_LABELS: Record<Database["public"]["Enums"]["ficha_status"], string> = {
  cancelado: "Canceladas",
  entregue: "Entregues",
  pendente: "Pendentes",
};

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
    const deliveryYearRange = getYearToDateRange();
    const supabase = createServerSupabaseClient();

    const [fichasResult, clientesResult, previousFichasResult, previousClientesResult, deliveryYearResult] = await withRetry(() =>
      Promise.all([
        fetchFichas(supabase, range, filters),
        supabase.from("clientes").select("primeira_ficha").gte("primeira_ficha", range.start).lte("primeira_ficha", range.end).limit(MAX_ROWS),
        fetchFichas(supabase, previousRange, filters),
        supabase
          .from("clientes")
          .select("primeira_ficha")
          .gte("primeira_ficha", previousRange.start)
          .lte("primeira_ficha", previousRange.end)
          .limit(MAX_ROWS),
        fetchFichas(supabase, deliveryYearRange, filters),
      ]),
    );

    const error =
      fichasResult.error ??
      clientesResult.error ??
      previousFichasResult.error ??
      previousClientesResult.error ??
      deliveryYearResult.error;

    if (error) {
      return {
        data: null,
        kind: "error",
        message: error.message,
      };
    }

    const fichas = fichasResult.fichas;
    const previousFichas = previousFichasResult.fichas;
    const [itens, previousItens] = await withRetry(() =>
      Promise.all([
        fetchItens(supabase, fichas.map((ficha) => ficha.id)),
        fetchItens(supabase, previousFichas.map((ficha) => ficha.id)),
      ]),
    );

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
      deliveryYearFichas: deliveryYearResult.fichas,
    });

    return {
      data,
      kind: "ok",
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const isNetwork = /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|network/i.test(raw);

    return {
      data: null,
      kind: "error",
      message: isNetwork
        ? "Não foi possível conectar ao banco de dados. Verifique a conexão e tente novamente."
        : raw || "Falha ao carregar relatório.",
    };
  }
}

// Reexecuta leituras idempotentes em caso de falha de rede transitória (ex.: "fetch failed" do undici).
async function withRetry<T>(run: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
      }
    }
  }

  throw lastError;
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

async function fetchFichas(
  supabase: SupabaseServerClient,
  range: { end: string; start: string },
  filters: Pick<RelatorioFilters, "evento" | "status"> = {},
) {
  let query = supabase
    .from("fichas")
    .select("id, cliente_nome_snapshot, data_inicio, data_entrega, delivered_at, material, status, arte, vendedor, evento")
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

async function fetchItens(supabase: SupabaseServerClient, fichaIds: string[]) {
  if (fichaIds.length === 0) {
    return {
      error: null,
      itens: [] as FichaItemRow[],
    };
  }

  // Fragmenta o filtro `in` para não gerar uma URL gigante (periodos longos com muitas fichas
  // estouram o limite de tamanho da requisição e causam "fetch failed").
  const chunks: string[][] = [];
  for (let index = 0; index < fichaIds.length; index += ITENS_CHUNK_SIZE) {
    chunks.push(fichaIds.slice(index, index + ITENS_CHUNK_SIZE));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase.from("ficha_itens").select("ficha_id, produto, quantidade, tamanho").in("ficha_id", chunk).limit(ITENS_CHUNK_SIZE * 12),
    ),
  );

  const error = results.find((result) => result.error)?.error ?? null;
  const itens = results.flatMap((result) => result.data ?? []);

  return {
    error,
    itens,
  };
}

function buildRelatorioData(input: {
  clientes: ClienteRow[];
  filters: RelatorioFilters;
  fichas: FichaRow[];
  itens: FichaItemRow[];
  previousClientes: ClienteRow[];
  previousFichas: FichaRow[];
  previousItens: FichaItemRow[];
  range: { end: string; start: string };
  deliveryYearFichas: FichaRow[];
}): RelatorioData {
  const itensPorFicha = groupItensByFicha(input.itens);
  const totalFichas = input.fichas.length;
  const totalItens = sumItens(input.itens);
  const fichasEntregues = input.fichas.filter((ficha) => ficha.status === "entregue").length;
  const fichasPendentes = input.fichas.filter((ficha) => ficha.status === "pendente").length;
  const fichasCanceladas = input.fichas.filter((ficha) => ficha.status === "cancelado").length;
  const itensConfeccionados = sumItensForFichas(
    input.itens,
    new Set(input.fichas.filter((ficha) => ficha.status === "entregue").map((ficha) => ficha.id)),
  );
  const taxaEntrega = getPercent(fichasEntregues, fichasEntregues + fichasPendentes);
  const previousTaxaEntrega = getPercent(
    input.previousFichas.filter((ficha) => ficha.status === "entregue").length,
    input.previousFichas.filter((ficha) => ficha.status === "entregue" || ficha.status === "pendente").length,
  );
  const vendedores = buildVendedores(input.fichas, itensPorFicha);

  const comparativoAtual: RelatorioComparativoTotais = {
    clientes: input.clientes.length,
    fichas: totalFichas,
    itens: totalItens,
    taxaEntrega,
  };
  const comparativoAnterior: RelatorioComparativoTotais = {
    clientes: input.previousClientes.length,
    fichas: input.previousFichas.length,
    itens: sumItens(input.previousItens),
    taxaEntrega: previousTaxaEntrega,
  };

  return {
    comparativo: {
      clientes: comparativoAtual.clientes - comparativoAnterior.clientes,
      fichas: comparativoAtual.fichas - comparativoAnterior.fichas,
      itens: comparativoAtual.itens - comparativoAnterior.itens,
      taxaEntrega: comparativoAtual.taxaEntrega - comparativoAnterior.taxaEntrega,
    },
    comparativoAnterior,
    comparativoAtual,
    detalhes: input.fichas.map((ficha) => ({
      cliente: ficha.cliente_nome_snapshot,
      data: ficha.data_inicio,
      id: ficha.id,
      material: ficha.material ?? "Não especificado",
      quantidade: sumItens(itensPorFicha.get(ficha.id) ?? []),
      status: ficha.status,
      vendedor: ficha.vendedor ?? "Sem vendedor",
    })),
    eventos: {
      avulsos: input.fichas.filter((ficha) => !ficha.evento).length,
      eventos: input.fichas.filter((ficha) => ficha.evento).length,
    },
    filtros: input.filters,
    granularidade: getGranularidade(input.range),
    periodoLabel: formatPeriodLabel(input.filters.periodo, input.range),
    personalizacoes: buildRank(input.fichas, itensPorFicha, (ficha) => formatPersonalizacaoLabel(ficha.arte)),
    rankings: {
      clientes: buildRank(input.fichas, itensPorFicha, (ficha) => ficha.cliente_nome_snapshot),
      materiais: buildRank(input.fichas, itensPorFicha, (ficha) => ficha.material ?? "Não especificado"),
      produtos: buildItemRank(input.itens, (item) => item.produto ?? "Não especificado"),
      tamanhos: buildItemRank(input.itens, (item) => item.tamanho ?? "Sem tamanho"),
      vendedores,
    },
    resumo: {
      entregasAnoAtual: countDelivered(input.deliveryYearFichas),
      entregasRecorteAnterior: countDelivered(input.previousFichas),
      fichasCanceladas,
      fichasEntregues,
      fichasPendentes,
      itensConfeccionados,
      itensPorFicha: totalFichas > 0 ? Math.round((totalItens / totalFichas) * 10) / 10 : 0,
      novosClientes: input.clientes.length,
      prazoMedioEntrega: getAverageLeadTime(input.fichas),
      taxaEntrega,
      totalFichas,
      totalItens,
    },
    statusDistribuicao: buildStatusDistribuicao(fichasEntregues, fichasPendentes, fichasCanceladas),
    tendencia: buildTendencia(input.fichas, itensPorFicha, input.range),
  };
}

function buildStatusDistribuicao(entregues: number, pendentes: number, canceladas: number): RelatorioStatusFatia[] {
  const total = entregues + pendentes + canceladas;

  return (
    [
      { status: "entregue", value: entregues },
      { status: "pendente", value: pendentes },
      { status: "cancelado", value: canceladas },
    ] as const
  )
    .filter((fatia) => fatia.value > 0)
    .map((fatia) => ({
      label: STATUS_LABELS[fatia.status],
      percent: getPercent(fatia.value, total),
      status: fatia.status,
      value: fatia.value,
    }));
}

function buildTendencia(
  fichas: FichaRow[],
  itensPorFicha: Map<string, FichaItemRow[]>,
  range: { end: string; start: string },
): RelatorioTrendPoint[] {
  const granularidade = getGranularidade(range);
  const buckets = new Map<string, RelatorioTrendPoint>();

  for (const bucket of getBucketKeys(range, granularidade)) {
    buckets.set(bucket, {
      bucket,
      criadas: 0,
      entregues: 0,
      itens: 0,
      label: formatBucketLabel(bucket, granularidade),
      pendentes: 0,
    });
  }

  for (const ficha of fichas) {
    if (!ficha.data_inicio) continue;
    const key = getBucketKey(ficha.data_inicio, granularidade);
    const point = buckets.get(key);
    if (!point) continue;

    point.criadas += 1;
    point.itens += sumItens(itensPorFicha.get(ficha.id) ?? []);
    if (ficha.status === "entregue") {
      point.entregues += 1;
    } else if (ficha.status === "pendente") {
      point.pendentes += 1;
    }
  }

  return Array.from(buckets.values());
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
    .sort((a, b) => b.totalFichas - a.totalFichas || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, 12);
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

function formatPersonalizacaoLabel(value: string | null) {
  const normalized = value?.replaceAll("_", " ").replaceAll("-", " ").trim().toLocaleLowerCase("pt-BR");

  if (!normalized) {
    return "Sem Personalização";
  }

  const labels = new Map([
    ["bordado", "Bordado"],
    ["dtf", "DTF"],
    ["dtf textil", "DTF Têxtil"],
    ["serigrafia", "Serigrafia"],
    ["silk", "Silk"],
    ["silk screen", "Silk Screen"],
    ["sublimacao", "Sublimação"],
    ["sublimação", "Sublimação"],
  ]);

  return labels.get(normalized) ?? toTitleCase(normalized);
}

function toTitleCase(value: string) {
  return value.replace(/\p{L}[\p{L}\p{M}]*/gu, (word) => {
    if (word.length <= 3 && word === word.toLocaleUpperCase("pt-BR").toLocaleLowerCase("pt-BR")) {
      return word.toLocaleUpperCase("pt-BR");
    }

    return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
  });
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

function getAverageLeadTime(fichas: FichaRow[]): number | null {
  const prazos: number[] = [];

  for (const ficha of fichas) {
    if (ficha.status !== "entregue" || !ficha.data_inicio) continue;

    const entrega = (ficha.delivered_at ?? ficha.data_entrega)?.slice(0, 10);
    if (!entrega) continue;

    const dias = Math.round((createUtcDateFromInput(entrega).getTime() - createUtcDateFromInput(ficha.data_inicio).getTime()) / 86_400_000);
    if (Number.isFinite(dias) && dias >= 0) {
      prazos.push(dias);
    }
  }

  if (prazos.length === 0) {
    return null;
  }

  return Math.round((prazos.reduce((sum, dias) => sum + dias, 0) / prazos.length) * 10) / 10;
}

function getGranularidade(range: { end: string; start: string }): RelatorioGranularidade {
  const days = getRangeSpanDays(range);
  if (days <= 62) return "dia";
  if (days <= 215) return "semana";
  return "mes";
}

function getBucketKeys(range: { end: string; start: string }, granularidade: RelatorioGranularidade): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  let cursor = getBucketKey(range.start, granularidade);
  const lastKey = getBucketKey(range.end, granularidade);

  // Garante terminação mesmo com intervalos atípicos.
  for (let guard = 0; guard < 800; guard += 1) {
    if (!seen.has(cursor)) {
      seen.add(cursor);
      keys.push(cursor);
    }
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
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDaysToInput(value, mondayOffset);
}

function getRangeSpanDays(range: { end: string; start: string }) {
  return Math.max(1, Math.round((createUtcDateFromInput(range.end).getTime() - createUtcDateFromInput(range.start).getTime()) / 86_400_000) + 1);
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

function getYearToDateRange() {
  const today = getBusinessTodayInput();
  const current = createDateFromInput(today);

  return {
    end: today,
    start: `${current.getUTCFullYear()}-01-01`,
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

function countDelivered(fichas: FichaRow[]) {
  return fichas.filter((ficha) => ficha.status === "entregue").length;
}

function formatDate(value: string) {
  return formatDateInput(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
