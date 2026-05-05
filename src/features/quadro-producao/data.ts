import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { getLegacyKanbanStatusFromSlug, INSUMO_STATUS_LABELS } from "./config";

type KanbanColumnRow = Database["public"]["Tables"]["kanban_columns"]["Row"];
type FichaStatus = Database["public"]["Enums"]["ficha_status"];
type KanbanStatus = Database["public"]["Enums"]["kanban_status"];
type InsumoStatus = Database["public"]["Enums"]["insumo_status"];

type BoardFichaRow = Pick<
  Database["public"]["Tables"]["fichas"]["Row"],
  | "arte"
  | "cliente_nome_snapshot"
  | "created_at"
  | "data_entrega"
  | "evento"
  | "id"
  | "insumo_status"
  | "is_manual_card"
  | "kanban_column_id"
  | "kanban_ordem"
  | "kanban_status"
  | "kanban_status_updated_at"
  | "material"
  | "numero_venda"
  | "observacoes"
  | "status"
  | "updated_at"
  | "vendedor"
> & {
  ficha_imagens?: Array<Pick<Database["public"]["Tables"]["ficha_imagens"]["Row"], "ordem" | "url">>;
};

export type QuadroProducaoFilters = {
  arte: string;
  busca: string;
  insumo: string;
  semana: boolean;
  tecido: string;
};

export type KanbanCardSummary = {
  arte: string | null;
  clienteNome: string;
  createdAt: string;
  dataEntrega: string;
  evento: boolean;
  id: string;
  insumoStatus: InsumoStatus;
  isManualCard: boolean;
  kanbanColumnId: string;
  kanbanOrder: number;
  kanbanStatus: KanbanStatus;
  kanbanStatusUpdatedAt: string;
  material: string | null;
  numeroVenda: string | null;
  observacoes: string | null;
  status: FichaStatus;
  thumbUrl: string | null;
  updatedAt: string;
  vendedor: string | null;
};

export type KanbanBoardColumn = KanbanColumnRow & {
  cards: KanbanCardSummary[];
  openCount: number;
};

export type QuadroProducaoSnapshot = {
  columns: KanbanBoardColumn[];
  fetchedAt: string;
  filterOptions: {
    artes: string[];
    insumos: Array<{ label: string; value: InsumoStatus }>;
    tecidos: string[];
  };
  totalVisible: number;
};

export type QuadroProducaoResult =
  | {
      kind: "ok";
      snapshot: QuadroProducaoSnapshot;
    }
  | {
      kind: "not-configured";
      snapshot: null;
    }
  | {
      kind: "error";
      message: string;
      snapshot: null;
    };

export type CreateManualKanbanCardInput = {
  arte?: string;
  columnId: string;
  dataEntrega: string;
  evento: boolean;
  insumoStatus: InsumoStatus;
  material?: string;
  title: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getCurrentWeekRange() {
  const today = startOfDay(new Date());
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = addDays(today, mondayOffset);
  const end = addDays(start, 6);
  return { end, start };
}

function isWithinCurrentWeek(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const { end, start } = getCurrentWeekRange();
  return date >= start && date <= end;
}

function normalizeForSearch(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function sortText(values: Iterable<string>) {
  return Array.from(new Set(values))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "pt-BR", { sensitivity: "base" }));
}

function mapBoardCard(row: BoardFichaRow): KanbanCardSummary {
  const orderedImages = [...(row.ficha_imagens ?? [])].sort((left, right) => left.ordem - right.ordem);

  return {
    arte: row.arte,
    clienteNome: row.cliente_nome_snapshot,
    createdAt: row.created_at,
    dataEntrega: row.data_entrega,
    evento: row.evento,
    id: row.id,
    insumoStatus: row.insumo_status,
    isManualCard: row.is_manual_card,
    kanbanColumnId: row.kanban_column_id,
    kanbanOrder: row.kanban_ordem,
    kanbanStatus: row.kanban_status,
    kanbanStatusUpdatedAt: row.kanban_status_updated_at,
    material: row.material,
    numeroVenda: row.numero_venda,
    observacoes: row.observacoes,
    status: row.status,
    thumbUrl: orderedImages[0]?.url ?? null,
    updatedAt: row.updated_at,
    vendedor: row.vendedor,
  };
}

function matchesBoardFilters(card: KanbanCardSummary, filters: QuadroProducaoFilters) {
  if (filters.busca) {
    const haystack = normalizeForSearch(
      [card.clienteNome, card.numeroVenda, card.material, card.arte, card.vendedor].filter(Boolean).join(" "),
    );
    if (!haystack.includes(normalizeForSearch(filters.busca))) {
      return false;
    }
  }

  if (filters.semana && !isWithinCurrentWeek(card.dataEntrega)) {
    return false;
  }

  if (filters.tecido && normalizeForSearch(card.material) !== normalizeForSearch(filters.tecido)) {
    return false;
  }

  if (filters.arte && normalizeForSearch(card.arte) !== normalizeForSearch(filters.arte)) {
    return false;
  }

  if (filters.insumo && card.insumoStatus !== filters.insumo) {
    return false;
  }

  return true;
}

function slugifyColumnName(name: string) {
  return normalizeForSearch(name)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 48);
}

async function getKanbanColumns() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("kanban_columns").select("*").order("order_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function getOpenBoardCards() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("fichas")
    .select(
      "id, cliente_nome_snapshot, numero_venda, data_entrega, evento, arte, material, status, insumo_status, kanban_column_id, kanban_ordem, kanban_status, kanban_status_updated_at, is_manual_card, observacoes, vendedor, created_at, updated_at, ficha_imagens(url,ordem)",
    )
    .eq("status", "pendente")
    .order("kanban_ordem", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BoardFichaRow[];
}

export async function getQuadroProducaoSnapshot(
  filters: QuadroProducaoFilters,
): Promise<QuadroProducaoResult> {
  if (!getSupabaseConfigStatus().hasServerConfig) {
    return {
      kind: "not-configured",
      snapshot: null,
    };
  }

  try {
    const [columns, openCards] = await Promise.all([getKanbanColumns(), getOpenBoardCards()]);
    const mappedCards = openCards.map(mapBoardCard);
    const filteredCards = mappedCards.filter((card) => matchesBoardFilters(card, filters));
    const cardsByColumnId = new Map<string, KanbanCardSummary[]>();

    filteredCards.forEach((card) => {
      const columnCards = cardsByColumnId.get(card.kanbanColumnId) ?? [];
      columnCards.push(card);
      cardsByColumnId.set(card.kanbanColumnId, columnCards);
    });

    const boardColumns = columns.map<KanbanBoardColumn>((column) => ({
      ...column,
      cards: (cardsByColumnId.get(column.id) ?? []).sort((left, right) => left.kanbanOrder - right.kanbanOrder),
      openCount: cardsByColumnId.get(column.id)?.length ?? 0,
    }));

    const filterOptions = {
      artes: sortText(mappedCards.map((card) => card.arte ?? "")),
      insumos: Object.entries(INSUMO_STATUS_LABELS).map(([value, label]) => ({
        label,
        value: value as InsumoStatus,
      })),
      tecidos: sortText(mappedCards.map((card) => card.material ?? "")),
    };

    return {
      kind: "ok",
      snapshot: {
        columns: boardColumns,
        fetchedAt: new Date().toISOString(),
        filterOptions,
        totalVisible: filteredCards.length,
      },
    };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Falha ao carregar o quadro de produção.",
      snapshot: null,
    };
  }
}

export async function resolveDefaultKanbanColumnId(preferredSlug = "pendente") {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("kanban_columns")
    .select("id, slug")
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const preferred = data?.find((column) => column.slug === preferredSlug);
  return preferred?.id ?? data?.[0]?.id ?? null;
}

export async function createKanbanColumn(name: string) {
  const supabase = createServerSupabaseClient();
  const { data: columns, error: queryError } = await supabase
    .from("kanban_columns")
    .select("id, name, slug, order_index, is_system, color_token, created_at, updated_at")
    .order("order_index", { ascending: true });

  if (queryError) {
    throw new Error(queryError.message);
  }

  const baseSlug = slugifyColumnName(name) || "coluna";
  const usedSlugs = new Set((columns ?? []).map((column) => column.slug));
  let slug = baseSlug;
  let suffix = 2;

  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}_${suffix}`;
    suffix += 1;
  }

  const nextOrder = (columns?.length ?? 0) === 0 ? 0 : Math.max(...(columns ?? []).map((column) => column.order_index)) + 1;

  const { data, error } = await supabase
    .from("kanban_columns")
    .insert({
      color_token: null,
      is_system: false,
      name,
      order_index: nextOrder,
      slug,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function renameKanbanColumn(id: string, name: string) {
  const { data, error } = await createServerSupabaseClient()
    .from("kanban_columns")
    .update({ name })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function reorderKanbanColumns(columnIds: string[]) {
  const { error } = await createServerSupabaseClient().rpc("reorder_kanban_columns", {
    p_column_ids: columnIds,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sortKanbanColumnByDate(columnId: string) {
  const { error } = await createServerSupabaseClient().rpc("sort_kanban_cards_by_delivery_date", {
    p_kanban_column_id: columnId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function moveKanbanCard(cardId: string, destinationColumnId: string, destinationIndex: number) {
  const { error } = await createServerSupabaseClient().rpc("move_kanban_card", {
    p_ficha_id: cardId,
    p_kanban_column_id: destinationColumnId,
    p_target_index: destinationIndex,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateKanbanCardInsumoStatus(cardId: string, insumoStatus: InsumoStatus) {
  const { error } = await createServerSupabaseClient()
    .from("fichas")
    .update({ insumo_status: insumoStatus })
    .eq("id", cardId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markKanbanCardDelivered(cardId: string) {
  const { error } = await createServerSupabaseClient()
    .from("fichas")
    .update({
      delivered_at: new Date().toISOString(),
      status: "entregue",
    })
    .eq("id", cardId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createManualKanbanCard(input: CreateManualKanbanCardInput) {
  const supabase = createServerSupabaseClient();
  const { data: targetColumn, error: columnError } = await supabase
    .from("kanban_columns")
    .select("id, slug")
    .eq("id", input.columnId)
    .single();

  if (columnError || !targetColumn) {
    throw new Error(columnError?.message ?? "Coluna de destino não encontrada.");
  }

  const { count, error: countError } = await supabase
    .from("fichas")
    .select("id", { count: "exact", head: true })
    .eq("kanban_column_id", input.columnId)
    .eq("status", "pendente");

  if (countError) {
    throw new Error(countError.message);
  }

  const { data, error } = await supabase
    .from("fichas")
    .insert({
      arte: input.arte ?? null,
      cliente_nome_snapshot: input.title,
      data_entrega: input.dataEntrega,
      data_inicio: new Date().toISOString().slice(0, 10),
      evento: input.evento,
      insumo_status: input.insumoStatus,
      is_manual_card: true,
      kanban_column_id: input.columnId,
      kanban_ordem: count ?? 0,
      kanban_status: getLegacyKanbanStatusFromSlug(targetColumn.slug),
      kanban_status_updated_at: new Date().toISOString(),
      material: input.material ?? null,
      observacoes: null,
      status: "pendente",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
