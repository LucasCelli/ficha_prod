import { getServerErrorMessage } from "@/lib/server/boundaries";
import { getBusinessWeekRange } from "@/lib/dates";
import { normalizeNameOrCompany } from "@/lib/name-normalizer";
import { getSupabaseConfigStatus } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import {
  getKanbanColumnLabel,
  isKanbanColumnHiddenForPersonalizacao,
} from "./config";

type KanbanColumnRow = Database["public"]["Tables"]["kanban_columns"]["Row"];
type FichaStatus = Database["public"]["Enums"]["ficha_status"];
type KanbanStatus = Database["public"]["Enums"]["kanban_status"];

type BoardFichaRow = Database["public"]["Functions"]["get_kanban_board_cards"]["Returns"][number];

export type QuadroProducaoFilters = {
  arte: string;
  busca: string;
  semana: boolean;
  tecido: string;
};

export type KanbanCardSummary = {
  arte: string | null;
  clienteAuxiliar: string | null;
  clienteNome: string;
  dataEntrega: string;
  evento: boolean;
  id: string;
  itemQuantity: number;
  isManualCard: boolean;
  kanbanColumnId: string;
  kanbanOrder: number;
  kanbanStatus: KanbanStatus;
  material: string | null;
  numeroVenda: string | null;
  status: FichaStatus;
  thumbUrl: string | null;
  vendedor: string | null;
};

export type KanbanBoardColumn = KanbanColumnRow & {
  cards: KanbanCardSummary[];
  displayName: string;
  openCount: number;
};

export type QuadroProducaoSnapshot = {
  columns: KanbanBoardColumn[];
  fetchedAt: string;
  filterOptions: {
    artes: string[];
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
  material?: string;
  title: string;
};

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
  return {
    arte: row.arte,
    clienteAuxiliar: row.cliente_auxiliar,
    clienteNome: row.cliente_nome_snapshot,
    dataEntrega: row.data_entrega,
    evento: row.evento,
    id: row.id,
    itemQuantity: Number(row.item_quantity || 0),
    isManualCard: row.is_manual_card,
    kanbanColumnId: row.kanban_column_id,
    kanbanOrder: row.kanban_ordem,
    kanbanStatus: row.kanban_status,
    material: row.material,
    numeroVenda: row.numero_venda,
    status: row.status,
    thumbUrl: row.thumb_url,
    vendedor: row.vendedor,
  };
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

async function getOpenBoardCards(filters: QuadroProducaoFilters) {
  const supabase = createServerSupabaseClient();
  const week = filters.semana ? getBusinessWeekRange() : null;
  const { data, error } = await supabase.rpc("get_kanban_board_cards", {
    p_arte: filters.arte || null,
    p_material: filters.tecido || null,
    p_search: filters.busca || null,
    p_week_end: week?.end ?? null,
    p_week_start: week?.start ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BoardFichaRow[];
}

async function getOpenBoardFilterOptions() {
  const { data, error } = await createServerSupabaseClient()
    .from("fichas")
    .select("arte, material")
    .eq("status", "pendente");

  if (error) throw new Error(error.message);
  return data ?? [];
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
    const [columns, openCards, optionRows] = await Promise.all([
      getKanbanColumns(),
      getOpenBoardCards(filters),
      getOpenBoardFilterOptions(),
    ]);
    const filteredCards = openCards.map(mapBoardCard);
    const cardsByColumnId = new Map<string, KanbanCardSummary[]>();

    filteredCards.forEach((card) => {
      const columnCards = cardsByColumnId.get(card.kanbanColumnId) ?? [];
      columnCards.push(card);
      cardsByColumnId.set(card.kanbanColumnId, columnCards);
    });

    const boardColumns = columns
      .filter((column) => !isKanbanColumnHiddenForPersonalizacao(column.slug, filters.arte))
      .map<KanbanBoardColumn>((column) => {
        const cards = (cardsByColumnId.get(column.id) ?? []).sort(
          (left, right) => left.kanbanOrder - right.kanbanOrder || left.id.localeCompare(right.id),
        );

        return {
          ...column,
          cards,
          displayName: getKanbanColumnLabel(column.slug, filters.arte, column.name),
          openCount: cards.length,
        };
      });

    const filterOptions = {
      artes: sortText(optionRows.map((card) => card.arte ?? "")),
      tecidos: sortText(optionRows.map((card) => card.material ?? "")),
    };

    return {
      kind: "ok",
      snapshot: {
        columns: boardColumns,
        fetchedAt: new Date().toISOString(),
        filterOptions,
        totalVisible: boardColumns.reduce((total, column) => total + column.openCount, 0),
      },
    };
  } catch (error) {
    return {
      kind: "error",
      message: getServerErrorMessage("quadro.snapshot", error, "Não foi possível carregar o quadro de produção."),
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
  const baseSlug = slugifyColumnName(name) || "coluna";
  const { data: columnId, error } = await supabase.rpc("create_kanban_column_atomic", {
    p_base_slug: baseSlug,
    p_name: name,
  });

  if (error || !columnId) {
    throw new Error(error?.message ?? "Coluna não criada.");
  }

  const { data, error: queryError } = await supabase.from("kanban_columns").select("*").eq("id", columnId).single();
  if (queryError) throw new Error(queryError.message);
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


export async function markKanbanCardDelivered(cardId: string, changedByUserId: string) {
  const { error } = await createServerSupabaseClient().rpc("set_ficha_delivery_status_atomic", {
    p_actor_id: changedByUserId,
    p_delivered: true,
    p_ficha_id: cardId,
  });

  if (error) throw new Error(error.message);
}

export async function createManualKanbanCard(input: CreateManualKanbanCardInput, createdByUserId: string) {
  const { data, error } = await createServerSupabaseClient().rpc("create_manual_kanban_card_atomic", {
    p_actor_id: createdByUserId,
    p_arte: input.arte ?? null,
    p_column_id: input.columnId,
    p_data_entrega: input.dataEntrega,
    p_evento: input.evento,
    p_material: input.material ?? null,
    p_title: normalizeNameOrCompany(input.title),
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Cartão não criado.");
  }

  return { id: data };
}
