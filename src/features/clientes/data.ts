import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { FichaListItem } from "@/features/fichas/data";

export type ClienteListItem = Pick<
  Database["public"]["Tables"]["clientes"]["Row"],
  "id" | "nome" | "email" | "telefone" | "primeira_ficha" | "ultima_ficha" | "total_fichas"
>;

export type ClienteFilters = {
  page?: number;
  termo?: string;
};

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
      .select("id, nome, email, telefone, primeira_ficha, ultima_ficha, total_fichas", { count: "exact" })
      .order("ultima_ficha", { ascending: false, nullsFirst: false })
      .order("nome", { ascending: true })
      .range(getOffset(filters.page, CLIENTES_PAGE_SIZE), getOffset(filters.page, CLIENTES_PAGE_SIZE) + CLIENTES_PAGE_SIZE - 1);

    if (filters.termo) {
      query = query.ilike("nome", `%${filters.termo}%`);
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
      .select("id, cliente_nome_snapshot, data_inicio, data_entrega, status, kanban_status, insumo_status, arte, vendedor, numero_venda, evento, kanban_column:kanban_columns(name,slug)")
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

export function normalizeClienteSearch(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

export function normalizeClientePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(page) && page > 1 ? page : undefined;
}

function getOffset(page: number | undefined, pageSize: number) {
  return ((page ?? 1) - 1) * pageSize;
}
