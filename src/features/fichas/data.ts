import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type FichaStatus = Database["public"]["Enums"]["ficha_status"];
export type FichaStatusFilter = FichaStatus | "atrasado";
export type FichaItem = Database["public"]["Tables"]["ficha_itens"]["Row"];
export type FichaImage = Database["public"]["Tables"]["ficha_imagens"]["Row"];

export type FichaListItem = Pick<
  Database["public"]["Tables"]["fichas"]["Row"],
  | "id"
  | "cliente_nome_snapshot"
  | "data_inicio"
  | "data_entrega"
  | "status"
  | "kanban_status"
  | "insumo_status"
  | "arte"
  | "vendedor"
  | "numero_venda"
  | "evento"
> & {
  ficha_imagens?: { url: string }[];
};

export type FichaOverdueCandidate = Pick<Database["public"]["Tables"]["fichas"]["Row"], "data_entrega" | "status">;

export type FichaDetail = Database["public"]["Tables"]["fichas"]["Row"] & {
  imagens: FichaImage[];
  itens: FichaItem[];
};

export type FichaFilters = {
  arte?: string;
  busca?: string;
  cliente?: string;
  dataFim?: string;
  dataInicio?: string;
  evento?: boolean;
  id?: string;
  page?: number;
  status?: FichaStatusFilter;
};

export type FichaListResult =
  | {
      kind: "ok";
      fichas: FichaListItem[];
      total: number;
    }
  | {
      kind: "not-configured";
      fichas: [];
      total: 0;
    }
  | {
      kind: "error";
      fichas: [];
      total: 0;
      message: string;
    };

export type FichaDetailResult =
  | {
      ficha: FichaDetail;
      kind: "ok";
    }
  | {
      ficha: null;
      kind: "not-configured" | "not-found";
    }
  | {
      ficha: null;
      kind: "error";
      message: string;
    };

export const FICHAS_PAGE_SIZE = 25;
const BUSINESS_TIME_ZONE = "America/Cuiaba";

export async function listFichas(filters: FichaFilters = {}): Promise<FichaListResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      kind: "not-configured",
      fichas: [],
      total: 0,
    };
  }

  try {
    const supabase = createServerSupabaseClient();
    const query = applyFichaFilters(
      supabase
        .from("fichas")
        .select(
          "id, cliente_nome_snapshot, data_inicio, data_entrega, status, kanban_status, insumo_status, arte, vendedor, numero_venda, evento, ficha_imagens(url)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .order("data_entrega", { ascending: false })
        .range(getOffset(filters.page, FICHAS_PAGE_SIZE), getOffset(filters.page, FICHAS_PAGE_SIZE) + FICHAS_PAGE_SIZE - 1),
      filters,
    );

    const { data, error, count } = await query;

    if (error) {
      return {
        kind: "error",
        fichas: [],
        total: 0,
        message: error.message,
      };
    }

    return {
      kind: "ok",
      fichas: data ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    return {
      kind: "error",
      fichas: [],
      total: 0,
      message: error instanceof Error ? error.message : "Falha ao consultar fichas.",
    };
  }
}

export async function listFichasForOperationalPdf(filters: FichaFilters = {}): Promise<FichaListResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      kind: "not-configured",
      fichas: [],
      total: 0,
    };
  }

  try {
    const supabase = createServerSupabaseClient();
    const query = applyFichaFilters(
      supabase
        .from("fichas")
        .select(
          "id, cliente_nome_snapshot, data_inicio, data_entrega, status, kanban_status, insumo_status, arte, vendedor, numero_venda, evento",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .order("data_entrega", { ascending: false })
        .range(getOffset(filters.page, FICHAS_PAGE_SIZE), getOffset(filters.page, FICHAS_PAGE_SIZE) + FICHAS_PAGE_SIZE - 1),
      filters,
    );

    const { data, error, count } = await query;

    if (error) {
      return {
        kind: "error",
        fichas: [],
        total: 0,
        message: error.message,
      };
    }

    return {
      kind: "ok",
      fichas: data ?? [],
      total: count ?? 0,
    };
  } catch (error) {
    return {
      kind: "error",
      fichas: [],
      total: 0,
      message: error instanceof Error ? error.message : "Falha ao consultar fichas para PDF.",
    };
  }
}

export async function getFichaById(id: string): Promise<FichaDetailResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      ficha: null,
      kind: "not-configured",
    };
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from("fichas").select("*").eq("id", id).maybeSingle();

    if (error) {
      return {
        ficha: null,
        kind: "error",
        message: error.message,
      };
    }

    if (!data) {
      return {
        ficha: null,
        kind: "not-found",
      };
    }

    const { data: itens, error: itensError } = await supabase
      .from("ficha_itens")
      .select("*")
      .eq("ficha_id", id)
      .order("ordem", { ascending: true });

    if (itensError) {
      return {
        ficha: null,
        kind: "error",
        message: itensError.message,
      };
    }

    const { data: imagens, error: imagensError } = await supabase
      .from("ficha_imagens")
      .select("*")
      .eq("ficha_id", id)
      .order("ordem", { ascending: true });

    if (imagensError) {
      return {
        ficha: null,
        kind: "error",
        message: imagensError.message,
      };
    }

    return {
      ficha: {
        ...data,
        imagens: imagens ?? [],
        itens: itens ?? [],
      },
      kind: "ok",
    };
  } catch (error) {
    return {
      ficha: null,
      kind: "error",
      message: error instanceof Error ? error.message : "Falha ao carregar a ficha.",
    };
  }
}

export function normalizeFichaStatus(value: string | string[] | undefined): FichaStatusFilter | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "pendente" || raw === "entregue" || raw === "atrasado") {
    return raw;
  }

  return undefined;
}

export function normalizeTextFilter(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

export function normalizePageFilter(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(page) && page > 1 ? page : undefined;
}

export function normalizeBooleanFilter(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "true" || raw === "sim" || raw === "1" || raw === "on") return true;
  if (raw === "false" || raw === "nao" || raw === "não" || raw === "0") return false;
  return undefined;
}

function getSafeSearchPattern(value: string) {
  const cleanValue = normalizeSearchText(value).replace(/\s+/g, " ").trim();
  return `%${cleanValue}%`;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim();
}

function applyFichaFilters<T extends FichaQuery>(query: T, filters: FichaFilters) {
  let nextQuery = query;

  if (filters.status === "atrasado") {
    nextQuery = nextQuery.neq("status", "entregue").lt("data_entrega", getBusinessTodayInput()) as T;
  } else if (filters.status) {
    nextQuery = nextQuery.eq("status", filters.status) as T;
  }

  if (filters.id) {
    nextQuery = nextQuery.eq("id", filters.id) as T;
  }

  if (filters.busca) {
    nextQuery = nextQuery.ilike("busca_normalizada", getSafeSearchPattern(filters.busca)) as T;
  }

  if (typeof filters.evento === "boolean") {
    nextQuery = nextQuery.eq("evento", filters.evento) as T;
  }

  if (filters.dataInicio) {
    nextQuery = nextQuery.gte("data_entrega", filters.dataInicio) as T;
  }

  if (filters.dataFim) {
    nextQuery = nextQuery.lte("data_entrega", filters.dataFim) as T;
  }

  return nextQuery;
}

type FichaQuery = {
  eq: (column: string, value: string | boolean) => FichaQuery;
  gte: (column: string, value: string) => FichaQuery;
  ilike: (column: string, pattern: string) => FichaQuery;
  lte: (column: string, value: string) => FichaQuery;
  lt: (column: string, value: string) => FichaQuery;
  neq: (column: string, value: string) => FichaQuery;
  or: (filters: string) => FichaQuery;
};

function getOffset(page: number | undefined, pageSize: number) {
  return ((page ?? 1) - 1) * pageSize;
}

export function isFichaOverdue(ficha: FichaOverdueCandidate) {
  return ficha.status !== "entregue" && ficha.data_entrega < getBusinessTodayInput();
}

export function getFichaOverdueDays(ficha: FichaOverdueCandidate) {
  if (!isFichaOverdue(ficha)) {
    return 0;
  }

  const deliveryTime = Date.parse(`${ficha.data_entrega}T00:00:00.000Z`);
  const todayTime = Date.parse(`${getBusinessTodayInput()}T00:00:00.000Z`);

  if (!Number.isFinite(deliveryTime) || !Number.isFinite(todayTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((todayTime - deliveryTime) / 86_400_000));
}

function getBusinessTodayInput() {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function normalizeDateFilter(value: string | string[] | undefined) {
  const raw = normalizeTextFilter(value);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return undefined;
  }

  return raw;
}
