import type { CSSProperties } from "react";
import type { Droppable } from "@dnd-kit/dom";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import { isSortable } from "@dnd-kit/react/sortable";
import { formatDateInput, formatShortDateInput, getBusinessTodayInput, getDateInputDifferenceInDays } from "@/lib/dates";
import type { KanbanBoardColumn, KanbanCardSummary, QuadroProducaoFilters, QuadroProducaoResult } from "./data";

export type ManualCardDraft = {
  arte: string;
  columnId: string;
  dataEntrega: string;
  evento: boolean;
  material: string;
  title: string;
};

export type DragStart = { cardId: string; columnId: string; index: number };
export type DragDestination = { columnId: string; index: number };

export const BOARD_QUERY_KEY = "quadro-producao";
export const DND_TIMING = { duration: 130, easing: "cubic-bezier(0.2, 0, 0, 1)" };
export const CARD_SORTABLE_PLUGINS = [SortableKeyboardPlugin];

export function formatDate(value: string) {
  return formatShortDateInput(value);
}

export function formatDateLong(value: string) {
  return formatDateInput(value, { day: "2-digit", month: "long", year: "numeric" });
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function getDeliveryUrgency(card: KanbanCardSummary) {
  if (card.kanbanStatus === "na_costura") return "default";
  const remainingDays = getDateInputDifferenceInDays(card.dataEntrega);
  if (remainingDays === null) return "default";
  if (remainingDays <= 1) return "danger";
  if (remainingDays <= 7) return "warning";
  return "default";
}

export function getDeliveryUrgencyLabel(urgency: ReturnType<typeof getDeliveryUrgency>) {
  if (urgency === "danger") return "Entrega atrasada ou em risco imediato";
  if (urgency === "warning") return "Entrega próxima";
  return "Entrega dentro do prazo";
}

export function getCloudinaryThumbnailUrl(value: string | null, width = 320, height = 180) {
  if (!value || !value.includes("res.cloudinary.com") || !value.includes("/image/upload/")) return value;
  return value.replace("/image/upload/", `/image/upload/c_fill,w_${width},h_${height},f_auto,q_auto:eco/`);
}

export function areQuadroFiltersEqual(left: QuadroProducaoFilters, right: QuadroProducaoFilters) {
  return left.arte === right.arte && left.busca === right.busca && left.semana === right.semana && left.tecido === right.tecido;
}

export function getResultColumns(result: QuadroProducaoResult) {
  return result.kind === "ok" ? result.snapshot.columns : [];
}

function normalizeCards(column: KanbanBoardColumn, cards: KanbanCardSummary[]) {
  return {
    ...column,
    cards: cards.map((card, index) => ({ ...card, kanbanColumnId: column.id, kanbanOrder: index })),
    openCount: cards.length,
  };
}

export function normalizeColumnCounts(columns: KanbanBoardColumn[]) {
  return columns.map((column) => normalizeCards(column, column.cards));
}

export function findCardLocation(columns: KanbanBoardColumn[], cardId: string): DragDestination | null {
  for (const column of columns) {
    const index = column.cards.findIndex((card) => card.id === cardId);
    if (index >= 0) return { columnId: column.id, index };
  }
  return null;
}

export function moveCard(columns: KanbanBoardColumn[], cardId: string, destination: DragDestination) {
  const source = findCardLocation(columns, cardId);
  if (!source) return columns;
  const sourceColumn = columns.find((column) => column.id === source.columnId);
  const destinationColumn = columns.find((column) => column.id === destination.columnId);
  if (!sourceColumn || !destinationColumn) return columns;

  if (sourceColumn.id === destinationColumn.id) {
    const cards = [...sourceColumn.cards];
    const [card] = cards.splice(source.index, 1);
    if (!card) return columns;
    cards.splice(Math.max(0, Math.min(destination.index, cards.length)), 0, card);
    return columns.map((column) => column.id === sourceColumn.id ? normalizeCards(column, cards) : column);
  }

  const sourceCards = [...sourceColumn.cards];
  const [card] = sourceCards.splice(source.index, 1);
  if (!card) return columns;
  const destinationCards = [...destinationColumn.cards];
  destinationCards.splice(Math.max(0, Math.min(destination.index, destinationCards.length)), 0, card);
  return columns.map((column) => {
    if (column.id === sourceColumn.id) return normalizeCards(column, sourceCards);
    if (column.id === destinationColumn.id) return normalizeCards(column, destinationCards);
    return column;
  });
}

export function getDestination(target: Droppable | null, columns: KanbanBoardColumn[]): DragDestination | null {
  if (isSortable(target) && target.group != null) {
    return { columnId: String(target.group), index: Math.max(0, target.index) };
  }
  if (target?.id != null) {
    const columnId = String(target.id);
    const column = columns.find((item) => item.id === columnId);
    if (column) return { columnId, index: column.cards.length };
  }
  return null;
}

export function sameDestination(left: DragDestination | null, right: DragDestination | null) {
  return left?.columnId === right?.columnId && left?.index === right?.index;
}

export function getEmptyManualCardDraft(columnId: string): ManualCardDraft {
  return { arte: "", columnId, dataEntrega: getBusinessTodayInput(), evento: false, material: "", title: "" };
}

export function stopCardDrag(event: { nativeEvent?: Event; stopPropagation: () => void }) {
  event.nativeEvent?.stopImmediatePropagation();
  event.stopPropagation();
}

export function getColumnAccentStyle(orderIndex: number): CSSProperties {
  const accents = ["var(--color-primary)", "var(--color-primary)", "var(--color-info)", "var(--color-primary)", "var(--color-success)"];
  return { "--quadro-column-accent": accents[((orderIndex % accents.length) + accents.length) % accents.length] } as CSSProperties;
}

export function updateQueryResult(
  result: QuadroProducaoResult | undefined,
  updater: (columns: KanbanBoardColumn[]) => KanbanBoardColumn[],
) {
  if (!result || result.kind !== "ok") return result;
  const columns = updater(result.snapshot.columns);
  return {
    ...result,
    snapshot: { ...result.snapshot, columns, totalVisible: columns.reduce((total, column) => total + column.openCount, 0) },
  } satisfies QuadroProducaoResult;
}