import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { FichaListItem } from "@/features/fichas/data";

export type ClienteListItem = Pick<
  Database["public"]["Tables"]["clientes"]["Row"],
  "id" | "nome" | "email" | "telefone" | "primeira_ficha" | "ultima_ficha" | "total_fichas"
>;

export type ClienteSort = "recentes" | "antigos" | "mais_fichas" | "nome";
export type ClienteAtividade = "ativos" | "inativos" | "sem_fichas";

export type ClienteFilters = {
  page?: number;
  termo?: string;
  sort?: ClienteSort;
  atividade?: ClienteAtividade;
};

export type ClientesStats = {
  total: number;
  ativos: number;
  novosMes: number;
  semFichas: number;
};

export type ClientesStatsResult = { kind: "ok"; stats: ClientesStats } | { kind: "unavailable" };

const CLIENTE_ATIVO_JANELA_DIAS = 90;

export type ClientesListResult =
  | {
      clientes: ClienteListItem[];
      kind: "ok";
      total: number;
    }
  | {
      clientes: [];
      kind: "not-configured";
      total: 0;
    }
  | {
      clientes: [];
      kind: "error";
      message: string;
      total: 0;
    };

export type ClienteDetail = Database["public"]["Tables"]["clientes"]["Row"] & {
  fichas: FichaListItem[];
};

export type ClienteDetailResult =
  | {
      cliente: ClienteDetail;
      kind: "ok";
    }
  | {
      cliente: null;
      kind: "not-configured";
    }
  | {
      cliente: null;
      kind: "not-found";
    }
  | {
      cliente: null;
      kind: "error";
      message: string;
    };

export const CLIENTES_PAGE_SIZE = 30;
const CLIENTE_HISTORY_LIMIT = 20;

export async function listClientes(filters: ClienteFilters = {}): Promise<ClientesListResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      clientes: [],
      kind: "not-configured",
      total: 0,
    };
  }

  try {
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("clientes")
      .select("id, nome, email, telefone, primeira_ficha, ultima_ficha, total_fichas", { count: "exact" });

    query = applyClienteSort(query, filters.sort);
    query = query.range(getOffset(filters.page, CLIENTES_PAGE_SIZE), getOffset(filters.page, CLIENTES_PAGE_SIZE) + CLIENTES_PAGE_SIZE - 1);

    if (filters.termo) {
      query = query.ilike("nome", `%${filters.termo}%`);
    }

    if (filters.atividade === "ativos") {
      query = query.gte("ultima_ficha", getAtividadeCutoff());
    } else if (filters.atividade === "inativos") {
      query = query.lt("ultima_ficha", getAtividadeCutoff());
    } else if (filters.atividade === "sem_fichas") {
      query = query.eq("total_fichas", 0);
    }

    const { count, data, error } = await query;

    if (error) {
      return {
        clientes: [],
        kind: "error",
        message: error.message,
        total: 0,
      };
    }

    return {
      clientes: data ?? [],
      kind: "ok",
      total: count ?? 0,
    };
  } catch (error) {
    return {
      clientes: [],
      kind: "error",
      message: error instanceof Error ? error.message : "Falha ao consultar clientes.",
      total: 0,
    };
  }
}

export async function getClienteById(id: string): Promise<ClienteDetailResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      cliente: null,
      kind: "not-configured",
    };
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: cliente, error } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();

    if (error) {
      return {
        cliente: null,
        kind: "error",
        message: error.message,
      };
    }

    if (!cliente) {
      return {
        cliente: null,
        kind: "not-found",
      };
    }

    const { data: fichas, error: fichasError } = await supabase
      .from("fichas")
      .select("id, cliente_nome_snapshot, cliente_auxiliar, data_inicio, data_entrega, status, kanban_status, insumo_status, arte, vendedor, numero_venda, evento, kanban_column:kanban_columns(name,slug)")
      .eq("cliente_id", id)
      .order("data_entrega", { ascending: false })
      .limit(CLIENTE_HISTORY_LIMIT);

    if (fichasError) {
      return {
        cliente: null,
        kind: "error",
        message: fichasError.message,
      };
    }

    return {
      cliente: {
        ...cliente,
        fichas: fichas ?? [],
      },
      kind: "ok",
    };
  } catch (error) {
    return {
      cliente: null,
      kind: "error",
      message: error instanceof Error ? error.message : "Falha ao carregar o cliente.",
    };
  }
}

export async function getClientesStats(): Promise<ClientesStatsResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    return { kind: "unavailable" };
  }

  try {
    const supabase = createServerSupabaseClient();
    const cutoff = getAtividadeCutoff();
    const inicioMes = getInicioMes();

    const [total, ativos, novosMes, semFichas] = await Promise.all([
      supabase.from("clientes").select("id", { count: "exact", head: true }),
      supabase.from("clientes").select("id", { count: "exact", head: true }).gte("ultima_ficha", cutoff),
      supabase.from("clientes").select("id", { count: "exact", head: true }).gte("created_at", inicioMes),
      supabase.from("clientes").select("id", { count: "exact", head: true }).eq("total_fichas", 0),
    ]);

    if (total.error) {
      return { kind: "unavailable" };
    }

    return {
      kind: "ok",
      stats: {
        total: total.count ?? 0,
        ativos: ativos.count ?? 0,
        novosMes: novosMes.count ?? 0,
        semFichas: semFichas.count ?? 0,
      },
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export function normalizeClienteSearch(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

export function normalizeClienteSort(value: string | string[] | undefined): ClienteSort | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "antigos" || raw === "mais_fichas" || raw === "nome") {
    return raw;
  }
  return undefined;
}

export function normalizeClienteAtividade(value: string | string[] | undefined): ClienteAtividade | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "ativos" || raw === "inativos" || raw === "sem_fichas") {
    return raw;
  }
  return undefined;
}

export function normalizeClientePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(page) && page > 1 ? page : undefined;
}

function getOffset(page: number | undefined, pageSize: number) {
  return ((page ?? 1) - 1) * pageSize;
}

function applyClienteSort<T extends { order: (column: string, options: { ascending: boolean; nullsFirst?: boolean }) => T }>(
  query: T,
  sort: ClienteSort | undefined,
): T {
  switch (sort) {
    case "antigos":
      return query.order("primeira_ficha", { ascending: true, nullsFirst: false }).order("nome", { ascending: true });
    case "mais_fichas":
      return query.order("total_fichas", { ascending: false }).order("nome", { ascending: true });
    case "nome":
      return query.order("nome", { ascending: true });
    case "recentes":
    default:
      return query.order("ultima_ficha", { ascending: false, nullsFirst: false }).order("nome", { ascending: true });
  }
}

function getAtividadeCutoff() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - CLIENTE_ATIVO_JANELA_DIAS);
  return date.toISOString().slice(0, 10);
}

function getInicioMes() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
