"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { Feedback, type Draggable, type Droppable } from "@dnd-kit/dom";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import { keepPreviousData, type QueryKey, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Eye,
  Filter,
  GripVertical,
  Pencil,
  Plus,
  RefreshCw,
  Rows3,
  Star,
  X,
} from "lucide-react";
import {
  Badge,
  Card,
  EmptyState,
  Modal,
  Tooltip,
} from "@/components/ui";
import { formatDateInput, formatShortDateInput, getBusinessTodayInput, getDateInputDifferenceInDays } from "@/lib/dates";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import type { InsumoStatus } from "./config";
import { INSUMO_STATUS_LABELS, INSUMO_STATUS_VALUES } from "./config";
import type {
  KanbanBoardColumn,
  KanbanCardSummary,
  QuadroProducaoFilters,
  QuadroProducaoResult,
} from "./data";
import {
  fetchQuadroProducao,
  patchKanbanCardInsumoStatus,
  patchKanbanCardMove,
  patchKanbanColumn,
  postKanbanCardEntregar,
  postKanbanColumn,
  postKanbanColumnReorder,
  postKanbanColumnSortByDate,
  postManualKanbanCard,
} from "./api";
import { quadroProducaoSearchParamParsers } from "./search-params";

type QuadroProducaoClientProps = {
  initialFilters: QuadroProducaoFilters;
  initialResult: QuadroProducaoResult;
};

type ManualCardDraft = {
  arte: string;
  columnId: string;
  dataEntrega: string;
  evento: boolean;
  insumoStatus: InsumoStatus;
  material: string;
  title: string;
};

type MutationContext = {
  previous?: QuadroProducaoResult;
  previousQueries?: Array<[QueryKey, QuadroProducaoResult | undefined]>;
  queryKey: readonly unknown[];
};

type KanbanDragSource = {
  cardId: string;
  sourceColumnId: string;
  sourceIndex: number;
  snapshot: KanbanCardsByColumn;
};

type KanbanDragDestination = {
  columnId: string;
  index: number;
};

type KanbanCardsByColumn = Record<string, KanbanCardSummary[]>;

type KanbanDndLogEntry = {
  at: number;
  event: string;
  sequence: number;
  payload?: Record<string, unknown>;
};

declare global {
  interface Window {
    __quadroDndLogs?: KanbanDndLogEntry[];
    __clearQuadroDndLogs?: () => void;
    __exportQuadroDndLogs?: () => string;
  }
}

const KANBAN_DND_LOG_LIMIT = 800;

let kanbanDndLogSequence = 0;


function formatDate(value: string) {
  return formatShortDateInput(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function getRemainingDays(value: string) {
  return getDateInputDifferenceInDays(value);
}

function getDeliveryUrgency(card: KanbanCardSummary) {
  if (card.kanbanStatus === "na_costura") {
    return "default";
  }

  const remainingDays = getRemainingDays(card.dataEntrega);

  if (remainingDays === null) {
    return "default";
  }

  if (remainingDays <= 1) {
    return "danger";
  }

  if (remainingDays <= 7) {
    return "warning";
  }

  return "default";
}

function getDeliveryUrgencyLabel(urgency: ReturnType<typeof getDeliveryUrgency>) {
  if (urgency === "danger") {
    return "Entrega atrasada ou em risco imediato";
  }

  if (urgency === "warning") {
    return "Entrega próxima";
  }

  return "Entrega dentro do prazo";
}

function getCloudinaryThumbnailUrl(value: string | null, width = 320, height = 180) {
  if (!value || !value.includes("res.cloudinary.com") || !value.includes("/image/upload/")) {
    return value;
  }

  return value.replace("/image/upload/", `/image/upload/c_fill,w_${width},h_${height},f_auto,q_auto:eco/`);
}

function areQuadroFiltersEqual(left: QuadroProducaoFilters, right: QuadroProducaoFilters) {
  return (
    left.arte === right.arte &&
    left.busca === right.busca &&
    left.insumo === right.insumo &&
    left.semana === right.semana &&
    left.tecido === right.tecido
  );
}

function stopKanbanCardDrag(event: { nativeEvent?: Event; stopPropagation: () => void }) {
  event.nativeEvent?.stopImmediatePropagation();
  event.stopPropagation();
}

function isKanbanDndDebugEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem("quadro:dnd-debug") === "1";
}

function isKanbanDndConsoleEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem("quadro:dnd-console") === "1";
}

function setupKanbanDndDebugBuffer() {
  if (typeof window === "undefined" || window.__quadroDndLogs) {
    return;
  }

  window.__quadroDndLogs = [];
  window.__clearQuadroDndLogs = () => {
    window.__quadroDndLogs = [];
    kanbanDndLogSequence = 0;
  };
  window.__exportQuadroDndLogs = () => JSON.stringify(window.__quadroDndLogs ?? [], null, 2);
}

function summarizeCardsByColumn(cardsByColumn: KanbanCardsByColumn) {
  return Object.fromEntries(
    Object.entries(cardsByColumn).map(([columnId, cards]) => [
      columnId,
      {
        count: cards.length,
        firstIds: cards.slice(0, 4).map((card) => card.id),
      },
    ]),
  );
}

function logKanbanDnd(event: string, payload?: Record<string, unknown>) {
  if (!isKanbanDndDebugEnabled()) {
    return;
  }

  setupKanbanDndDebugBuffer();

  const entry: KanbanDndLogEntry = {
    at: Math.round(performance.now()),
    event,
    payload,
    sequence: ++kanbanDndLogSequence,
  };
  const logs = window.__quadroDndLogs ?? [];
  logs.push(entry);

  if (logs.length > KANBAN_DND_LOG_LIMIT) {
    logs.splice(0, logs.length - KANBAN_DND_LOG_LIMIT);
  }

  window.__quadroDndLogs = logs;

  if (isKanbanDndConsoleEnabled()) {
    console.debug("[quadro-dnd]", entry.event, entry);
  }
}

function formatDateLong(value: string) {
  return formatDateInput(value, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function cloneResult(result: QuadroProducaoResult) {
  if (result.kind !== "ok") {
    return result;
  }

  return {
    ...result,
    snapshot: {
      ...result.snapshot,
      columns: result.snapshot.columns.map((column) => ({
        ...column,
        cards: [...column.cards],
      })),
    },
  } satisfies QuadroProducaoResult;
}

function getCardsByColumn(columns: KanbanBoardColumn[]) {
  return Object.fromEntries(columns.map((column) => [column.id, column.cards])) as KanbanCardsByColumn;
}

function cloneCardsByColumn(cardsByColumn: KanbanCardsByColumn) {
  return Object.fromEntries(
    Object.entries(cardsByColumn).map(([columnId, cards]) => [columnId, [...cards]]),
  ) as KanbanCardsByColumn;
}

function findCardLocation(cardsByColumn: KanbanCardsByColumn, cardId: string) {
  for (const [columnId, cards] of Object.entries(cardsByColumn)) {
    const index = cards.findIndex((card) => card.id === cardId);

    if (index >= 0) {
      return { columnId, index };
    }
  }

  return null;
}

function moveCardInCardsByColumn(
  cardsByColumn: KanbanCardsByColumn,
  input: { cardId: string; destinationColumnId: string; destinationIndex: number },
) {
  const currentLocation = findCardLocation(cardsByColumn, input.cardId);

  if (!currentLocation) {
    return cardsByColumn;
  }

  const sourceCards = cardsByColumn[currentLocation.columnId] ?? [];
  const movedCard = sourceCards[currentLocation.index];

  if (!movedCard) {
    return cardsByColumn;
  }

  const sameColumn = currentLocation.columnId === input.destinationColumnId;
  const nextSourceCards = [...sourceCards];
  nextSourceCards.splice(currentLocation.index, 1);
  const nextDestinationCards = sameColumn
    ? nextSourceCards
    : [...(cardsByColumn[input.destinationColumnId] ?? [])];
  const insertAt = Math.max(0, Math.min(input.destinationIndex, nextDestinationCards.length));

  if (sameColumn && currentLocation.index === insertAt) {
    return cardsByColumn;
  }

  nextDestinationCards.splice(
    insertAt,
    0,
    sameColumn
      ? movedCard
      : {
          ...movedCard,
          kanbanColumnId: input.destinationColumnId,
        },
  );

  const next = {
    ...cardsByColumn,
    [input.destinationColumnId]: nextDestinationCards,
  };

  if (!sameColumn) {
    next[currentLocation.columnId] = nextSourceCards;
  }

  return next;
}

function getColumnDestination(
  target: Droppable | null,
  cardsByColumn: KanbanCardsByColumn,
): KanbanDragDestination | null {
  if (
    target != null &&
    typeof target === "object" &&
    "id" in target &&
    !isSortable(target)
  ) {
    const columnId = String((target as { id: unknown }).id);

    if (Object.prototype.hasOwnProperty.call(cardsByColumn, columnId)) {
      return {
        columnId,
        index: cardsByColumn[columnId]?.length ?? 0,
      };
    }
  }

  return null;
}

function getSortableDroppableDestination(target: Droppable | null): KanbanDragDestination | null {
  if (!isSortable(target) || target.group == null) {
    return null;
  }

  return {
    columnId: String(target.group),
    index: Math.max(0, target.index),
  };
}

function getSortableDraggableDestination(source: Draggable | null): KanbanDragDestination | null {
  if (!isSortable(source) || source.group == null) {
    return null;
  }

  return {
    columnId: String(source.group),
    index: Math.max(0, source.index),
  };
}

function areDragDestinationsEqual(
  left: KanbanDragDestination | null,
  right: KanbanDragDestination | null,
) {
  return left?.columnId === right?.columnId && left?.index === right?.index;
}


function applyOptimisticCardMove(
  result: QuadroProducaoResult,
  input: { cardId: string; destinationColumnId: string; destinationIndex: number },
) {
  if (result.kind !== "ok") {
    return result;
  }

  const next = cloneResult(result);

  if (next.kind !== "ok") {
    return result;
  }

  let movedCard: KanbanCardSummary | null = null;

  next.snapshot.columns.forEach((column) => {
    const index = column.cards.findIndex((card) => card.id === input.cardId);

    if (index >= 0) {
      movedCard = {
        ...column.cards[index],
        kanbanColumnId: input.destinationColumnId,
      };
      column.cards.splice(index, 1);
      column.openCount = column.cards.length;
      column.cards = column.cards.map((card, cardIndex) => ({
        ...card,
        kanbanOrder: cardIndex,
      }));
    }
  });

  if (!movedCard) {
    return result;
  }

  const destinationColumn = next.snapshot.columns.find((column) => column.id === input.destinationColumnId);

  if (!destinationColumn) {
    return result;
  }

  const insertAt = Math.min(input.destinationIndex, destinationColumn.cards.length);
  destinationColumn.cards.splice(insertAt, 0, movedCard);
  destinationColumn.openCount = destinationColumn.cards.length;
  destinationColumn.cards = destinationColumn.cards.map((card, cardIndex) => ({
    ...card,
    kanbanOrder: cardIndex,
  }));

  return next;
}

function applyOptimisticInsumoStatus(
  result: QuadroProducaoResult,
  input: { cardId: string; insumoStatus: InsumoStatus },
) {
  if (result.kind !== "ok") {
    return result;
  }

  const next = cloneResult(result);

  if (next.kind !== "ok") {
    return result;
  }

  next.snapshot.columns.forEach((column) => {
    column.cards = column.cards.map((card) =>
      card.id === input.cardId
        ? {
            ...card,
            insumoStatus: input.insumoStatus,
          }
        : card,
    );
  });

  return next;
}

function applyOptimisticCardDelivered(result: QuadroProducaoResult, cardId: string) {
  if (result.kind !== "ok") {
    return result;
  }

  const next = cloneResult(result);

  if (next.kind !== "ok") {
    return result;
  }

  let removed = false;

  next.snapshot.columns.forEach((column) => {
    const nextCards = column.cards.filter((card) => card.id !== cardId);

    if (nextCards.length !== column.cards.length) {
      removed = true;
      column.cards = nextCards.map((card, cardIndex) => ({
        ...card,
        kanbanOrder: cardIndex,
      }));
      column.openCount = column.cards.length;
    }
  });

  if (!removed) {
    return result;
  }

  return {
    ...next,
    snapshot: {
      ...next.snapshot,
      totalVisible: Math.max(0, next.snapshot.totalVisible - 1),
    },
  } satisfies QuadroProducaoResult;
}

function restorePreviousQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  previousQueries: Array<[QueryKey, QuadroProducaoResult | undefined]>,
) {
  previousQueries.forEach(([queryKey, result]) => {
    queryClient.setQueryData(queryKey, result);
  });
}

function applyOptimisticColumnOrder(result: QuadroProducaoResult, columnIds: string[]) {
  if (result.kind !== "ok") {
    return result;
  }

  const next = cloneResult(result);

  if (next.kind !== "ok") {
    return result;
  }

  const ordered = columnIds
    .map((id) => next.snapshot.columns.find((column) => column.id === id))
    .filter(Boolean)
    .map((column, index) => ({
      ...column,
      order_index: index,
    })) as KanbanBoardColumn[];

  return {
    ...next,
    snapshot: {
      ...next.snapshot,
      columns: ordered,
    },
  } satisfies QuadroProducaoResult;
}

function getEmptyManualCardDraft(columnId: string): ManualCardDraft {
  return {
    arte: "",
    columnId,
    dataEntrega: getBusinessTodayInput(),
    evento: false,
    insumoStatus: "tudo_ok",
    material: "",
    title: "",
  };
}

function getColumnAccentStyle(orderIndex: number): CSSProperties {
  const accents = [
    {
      accent: "var(--color-warning)",
      accentSoft: "color-mix(in srgb, var(--color-warning) 16%, var(--color-surface))",
    },
    {
      accent: "var(--color-primary)",
      accentSoft: "color-mix(in srgb, var(--color-primary) 16%, var(--color-surface))",
    },
    {
      accent: "var(--color-info)",
      accentSoft: "color-mix(in srgb, var(--color-info) 16%, var(--color-surface))",
    },
    {
      accent: "color-mix(in srgb, var(--color-warning) 64%, var(--color-danger))",
      accentSoft: "color-mix(in srgb, var(--color-warning) 18%, var(--color-surface))",
    },
    {
      accent: "var(--color-success)",
      accentSoft: "color-mix(in srgb, var(--color-success) 16%, var(--color-surface))",
    },
  ] as const;
  const entry = accents[((orderIndex % accents.length) + accents.length) % accents.length];

  return {
    "--quadro-column-accent": entry.accent,
    "--quadro-column-accent-soft": entry.accentSoft,
  } as CSSProperties;
}

export function QuadroProducaoClient({ initialFilters, initialResult }: QuadroProducaoClientProps) {
  const [filters, setFilters] = useQueryStates(quadroProducaoSearchParamParsers);
  const [searchDraft, setSearchDraft] = useState(filters.busca);
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [createColumnName, setCreateColumnName] = useState("");
  const [renameTarget, setRenameTarget] = useState<KanbanBoardColumn | null>(null);
  const [renameColumnName, setRenameColumnName] = useState("");
  const [createManualCardOpen, setCreateManualCardOpen] = useState(false);
  const [manualCardDraft, setManualCardDraft] = useState<ManualCardDraft>(() => getEmptyManualCardDraft(""));
  const [viewCard, setViewCard] = useState<KanbanCardSummary | null>(null);
  const [activeCardDrag, setActiveCardDrag] = useState<KanbanDragSource | null>(null);
  const [cardsByColumn, setCardsByColumn] = useState<KanbanCardsByColumn>(() =>
    initialResult.kind === "ok" ? getCardsByColumn(initialResult.snapshot.columns) : {},
  );
  const [pendingCardMoveCount, setPendingCardMoveCount] = useState(0);
  const [cardMoveSyncHold, setCardMoveSyncHold] = useState(false);
  const [hiddenDeliveredCardIds, setHiddenDeliveredCardIds] = useState<Set<string>>(() => new Set());
  const persistCardMoveChainRef = useRef<Promise<void>>(Promise.resolve());
  const persistCardMoveSequenceRef = useRef(0);
  const activeCardMovePersistCountRef = useRef(0);
  const latestQueuedCardMoveRef = useRef(0);
  const refreshAfterCardMoveTimeoutRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchDraft === filters.busca) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void setFilters({ busca: searchDraft || null });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [filters.busca, searchDraft, setFilters]);

  useEffect(() => {
    return () => {
      if (refreshAfterCardMoveTimeoutRef.current) {
        window.clearTimeout(refreshAfterCardMoveTimeoutRef.current);
      }
    };
  }, []);

  const isInitialQuery = areQuadroFiltersEqual(filters, initialFilters);
  const boardQuery = useQuery({
    initialData: isInitialQuery ? initialResult : undefined,
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchQuadroProducao({
        arte: filters.arte,
        busca: filters.busca,
        insumo: filters.insumo,
        semana: filters.semana,
        tecido: filters.tecido,
      }),
    queryKey: ["quadro-producao", filters],
  });

  const currentResult = boardQuery.data ?? initialResult;
  const currentColumns = useMemo(
    () =>
      currentResult.kind === "ok"
        ? currentResult.snapshot.columns.map((column) => {
            const cards = column.cards.filter((card) => !hiddenDeliveredCardIds.has(card.id));

            return {
              ...column,
              cards,
              openCount: cards.length,
            };
          })
        : [],
    [currentResult, hiddenDeliveredCardIds],
  );
  const currentTotalVisible = currentColumns.reduce((total, column) => total + column.openCount, 0);
  const defaultColumnId = currentColumns[0]?.id ?? "";
  const canonicalCardsByColumn = useMemo(() => getCardsByColumn(currentColumns), [currentColumns]);
  const shouldUseLocalCards =
    Boolean(activeCardDrag) ||
    pendingCardMoveCount > 0 ||
    cardMoveSyncHold;
  const visibleCardsByColumn = shouldUseLocalCards ? cardsByColumn : canonicalCardsByColumn;

  useEffect(() => {
    if (!isKanbanDndDebugEnabled()) {
      return;
    }

    logKanbanDnd("render-source", {
      activeCardId: activeCardDrag?.cardId ?? null,
      cardMoveSyncHold,
      pendingCardMoveCount,
      source: shouldUseLocalCards ? "local" : "canonical",
      visible: summarizeCardsByColumn(visibleCardsByColumn),
    });
  }, [activeCardDrag?.cardId, cardMoveSyncHold, pendingCardMoveCount, shouldUseLocalCards, visibleCardsByColumn]);

  const kanbanColumns = useMemo(
    () =>
      currentColumns.map((column) => {
        const cards = visibleCardsByColumn[column.id] ?? column.cards;

        return {
          ...column,
          cards,
          openCount: cards.length,
        };
      }),
    [currentColumns, visibleCardsByColumn],
  );

  const moveCardMutation = useMutation<{ ok: true }, Error, { cardId: string; destinationColumnId: string; destinationIndex: number }, MutationContext>({
    mutationFn: (input: { cardId: string; destinationColumnId: string; destinationIndex: number }) =>
      patchKanbanCardMove(input.cardId, input.destinationColumnId, input.destinationIndex),
    onError: (_error, _variables, context) => {
      if (context?.previousQueries) {
        restorePreviousQueries(queryClient, context.previousQueries);
      } else if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }

      toast.error("Não foi possível mover o cartão.");
    },
    onMutate: async (input) => {
      const queryKey = ["quadro-producao", filters];
      const boardQueryKey = ["quadro-producao"];
      const cancelPendingQueries = queryClient.cancelQueries({ queryKey: boardQueryKey }, { revert: false });
      const previous = queryClient.getQueryData<QuadroProducaoResult>(queryKey);
      const previousQueries = queryClient.getQueriesData<QuadroProducaoResult>({ queryKey: boardQueryKey });

      queryClient.setQueriesData<QuadroProducaoResult>({ queryKey: boardQueryKey }, (current) =>
        current ? applyOptimisticCardMove(current, input) : current,
      );
      await cancelPendingQueries;

      return { previous, previousQueries, queryKey };
    },
  });

  const insumoMutation = useMutation<{ ok: true }, Error, { cardId: string; insumoStatus: InsumoStatus }, MutationContext>({
    mutationFn: (input: { cardId: string; insumoStatus: InsumoStatus }) =>
      patchKanbanCardInsumoStatus(input.cardId, input.insumoStatus),
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onMutate: async (input) => {
      const queryKey = ["quadro-producao", filters];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<QuadroProducaoResult>(queryKey);

      if (previous) {
        queryClient.setQueryData(queryKey, applyOptimisticInsumoStatus(previous, input));
      }

      return { previous, queryKey };
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quadro-producao"] });
    },
  });

  const deliverCardMutation = useMutation<{ ok: true }, Error, { cardId: string }, MutationContext>({
    mutationFn: (input: { cardId: string }) => postKanbanCardEntregar(input.cardId),
    onError: (_error, _variables, context) => {
      setHiddenDeliveredCardIds((current) => {
        const next = new Set(current);
        next.delete(_variables.cardId);
        return next;
      });

      if (context?.previousQueries) {
        restorePreviousQueries(queryClient, context.previousQueries);
        return;
      }

      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onMutate: async (input) => {
      const queryKey = ["quadro-producao", filters];
      const boardQueryKey = ["quadro-producao"];
      await queryClient.cancelQueries({ queryKey: boardQueryKey });
      const previous = queryClient.getQueryData<QuadroProducaoResult>(queryKey);
      const previousQueries = queryClient.getQueriesData<QuadroProducaoResult>({ queryKey: boardQueryKey });
      setHiddenDeliveredCardIds((current) => new Set(current).add(input.cardId));

      queryClient.setQueriesData<QuadroProducaoResult>({ queryKey: boardQueryKey }, (current) =>
        current ? applyOptimisticCardDelivered(current, input.cardId) : current,
      );

      return { previous, previousQueries, queryKey };
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quadro-producao"] });
    },
    onSuccess: () => {
      toast.success("Ficha entregue", {
        description: "A ficha foi marcada como entregue.",
      });
    },
  });

  const createColumnMutation = useMutation({
    mutationFn: (name: string) => postKanbanColumn(name),
    onSuccess: async () => {
      setCreateColumnOpen(false);
      setCreateColumnName("");
      await queryClient.invalidateQueries({ queryKey: ["quadro-producao"] });
    },
  });

  const renameColumnMutation = useMutation({
    mutationFn: (input: { id: string; name: string }) => patchKanbanColumn(input.id, input.name),
    onSuccess: async () => {
      setRenameTarget(null);
      setRenameColumnName("");
      await queryClient.invalidateQueries({ queryKey: ["quadro-producao"] });
    },
  });

  const reorderColumnsMutation = useMutation<{ ok: true }, Error, string[], MutationContext>({
    mutationFn: (columnIds: string[]) => postKanbanColumnReorder(columnIds),
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onMutate: async (columnIds) => {
      const queryKey = ["quadro-producao", filters];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<QuadroProducaoResult>(queryKey);

      if (previous) {
        queryClient.setQueryData(queryKey, applyOptimisticColumnOrder(previous, columnIds));
      }

      return { previous, queryKey };
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quadro-producao"] });
    },
  });

  const sortColumnMutation = useMutation({
    mutationFn: (columnId: string) => postKanbanColumnSortByDate(columnId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quadro-producao"] });
      toast.success("Coluna reordenada", {
        description: "Os cartões foram ordenados por entrega.",
      });
    },
  });

  const createManualCardMutation = useMutation({
    mutationFn: (draft: ManualCardDraft) => postManualKanbanCard(draft),
    onSuccess: async () => {
      setCreateManualCardOpen(false);
      setManualCardDraft(getEmptyManualCardDraft(defaultColumnId));
      await queryClient.invalidateQueries({ queryKey: ["quadro-producao"] });
    },
  });
  const moveCardAsync = moveCardMutation.mutateAsync;
  const changeInsumo = insumoMutation.mutate;
  const deliverCard = deliverCardMutation.mutate;
  const scheduleCardMoveRefresh = useCallback(() => {
    if (refreshAfterCardMoveTimeoutRef.current) {
      window.clearTimeout(refreshAfterCardMoveTimeoutRef.current);
    }

    const refreshSequence = latestQueuedCardMoveRef.current;
    logKanbanDnd("persist.refresh-scheduled", {
      delayMs: 350,
      refreshSequence,
    });
    refreshAfterCardMoveTimeoutRef.current = window.setTimeout(() => {
      refreshAfterCardMoveTimeoutRef.current = null;
      logKanbanDnd("persist.refresh-start", {
        refreshSequence,
      });
      void queryClient.invalidateQueries({ queryKey: ["quadro-producao"] }).finally(() => {
        const stale = latestQueuedCardMoveRef.current !== refreshSequence || activeCardMovePersistCountRef.current > 0;
        logKanbanDnd("persist.refresh-finished", {
          activePersistCount: activeCardMovePersistCountRef.current,
          refreshSequence,
          stale,
        });

        if (!stale) {
          setActiveCardDrag(null);
          setCardMoveSyncHold(false);
          setPendingCardMoveCount(0);
        }
      });
    }, 350);
  }, [queryClient]);
  const queueCardMovePersist = useCallback((
    move: { cardId: string; destinationColumnId: string; destinationIndex: number },
    snapshot: KanbanCardsByColumn,
  ) => {
    if (refreshAfterCardMoveTimeoutRef.current) {
      window.clearTimeout(refreshAfterCardMoveTimeoutRef.current);
      refreshAfterCardMoveTimeoutRef.current = null;
      logKanbanDnd("persist.refresh-canceled-by-new-move");
    }

    const sequence = persistCardMoveSequenceRef.current + 1;
    persistCardMoveSequenceRef.current = sequence;
    latestQueuedCardMoveRef.current = sequence;
    activeCardMovePersistCountRef.current += 1;
    setCardMoveSyncHold(true);
    logKanbanDnd("persist.queued", {
      activePersistCount: activeCardMovePersistCountRef.current,
      move,
      sequence,
    });
    setPendingCardMoveCount((current) => current + 1);

    const persistTask = persistCardMoveChainRef.current
      .catch(() => undefined)
      .then(
        () =>
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, 60);
          }),
      )
      .then(async () => {
        logKanbanDnd("persist.request-start", {
          move,
          sequence,
        });
        await moveCardAsync(move);
        logKanbanDnd("persist.request-success", {
          move,
          sequence,
        });
      })
      .catch((error) => {
        logKanbanDnd("persist.request-error", {
          message: error instanceof Error ? error.message : String(error),
          move,
          sequence,
        });
        if (latestQueuedCardMoveRef.current === sequence) {
          setCardsByColumn(snapshot);
        }
      })
      .finally(() => {
        activeCardMovePersistCountRef.current = Math.max(0, activeCardMovePersistCountRef.current - 1);

        if (activeCardMovePersistCountRef.current === 0) {
          scheduleCardMoveRefresh();
          setPendingCardMoveCount((current) => Math.max(1, current));
          return;
        }

        setPendingCardMoveCount((current) => Math.max(0, current - 1));
      });

    persistCardMoveChainRef.current = persistTask.then(() => undefined, () => undefined);
  }, [moveCardAsync, scheduleCardMoveRefresh]);
  const handleMoveCard = useCallback((move: { cardId: string; destinationColumnId: string; destinationIndex: number }) => {
    const snapshot = cloneCardsByColumn(visibleCardsByColumn);
    logKanbanDnd("button-move", {
      move,
    });
    setCardsByColumn(moveCardInCardsByColumn(visibleCardsByColumn, move));
    queueCardMovePersist(move, snapshot);
  }, [queueCardMovePersist, visibleCardsByColumn]);
  const handlePersistDragMove = useCallback((
    move: { cardId: string; destinationColumnId: string; destinationIndex: number },
    snapshot: KanbanCardsByColumn,
  ) => {
    queueCardMovePersist(move, snapshot);
  }, [queueCardMovePersist]);
  const handleChangeInsumo = useCallback((card: KanbanCardSummary, insumoStatus: InsumoStatus) => {
    changeInsumo({
      cardId: card.id,
      insumoStatus,
    });
  }, [changeInsumo]);
  const handleDeliverCard = useCallback((card: KanbanCardSummary) => {
    setActiveCardDrag(null);
    deliverCard({ cardId: card.id });
  }, [deliverCard]);

  async function handleRefresh() {
    const result = await boardQuery.refetch();

    if (result.isSuccess) {
      setHiddenDeliveredCardIds(new Set());
      toast.success("Quadro atualizado", {
        description: "Os dados foram recarregados.",
      });
    }
  }

  function handleClearFilters() {
    setSearchDraft("");
    void setFilters({
      arte: null,
      busca: null,
      insumo: null,
      semana: null,
      tecido: null,
    });
  }

  function handleOpenRenameModal(column: KanbanBoardColumn) {
    setRenameTarget(column);
    setRenameColumnName(column.name);
  }

  function handleColumnShift(columnId: string, direction: "left" | "right") {
    const ids = currentColumns.map((column) => column.id);
    const currentIndex = ids.indexOf(columnId);

    if (currentIndex < 0) {
      return;
    }

    const nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= ids.length) {
      return;
    }

    const reordered = [...ids];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    reorderColumnsMutation.mutate(reordered);
  }

  function handleCreateColumnSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createColumnMutation.mutate(createColumnName);
  }

  function handleRenameColumnSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!renameTarget) {
      return;
    }

    renameColumnMutation.mutate({
      id: renameTarget.id,
      name: renameColumnName,
    });
  }

  function handleManualCardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createManualCardMutation.mutate(manualCardDraft);
  }

  function handleManualDraftChange<K extends keyof ManualCardDraft>(key: K, value: ManualCardDraft[K]) {
    setManualCardDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  if (currentResult.kind === "not-configured") {
    return (
      <section className="quadro-producao-view" aria-labelledby="quadro-producao-title">
        <header className="quadro-producao-view__header">
          <div className="page-heading">
            <div className="page-heading__copy">
              <Badge tone="info">Quadro</Badge>
              <h1 id="quadro-producao-title" className="app-title">
                Quadro de Produção
              </h1>
            </div>
          </div>
        </header>
        <EmptyState
          title="Quadro indisponível"
          description="Tente novamente."
        />
      </section>
    );
  }

  if (currentResult.kind === "error") {
    return (
      <section className="quadro-producao-view" aria-labelledby="quadro-producao-title">
        <header className="quadro-producao-view__header">
          <div className="page-heading">
            <div className="page-heading__copy">
              <Badge tone="warning">Atenção</Badge>
              <h1 id="quadro-producao-title" className="app-title">
                Quadro de Produção
              </h1>
            </div>
          </div>
        </header>
        <EmptyState
          actions={
            <button className="ui-button ui-button--secondary" onClick={handleRefresh} type="button">
              Tentar novamente
            </button>
          }
          title="Não foi possível carregar o quadro"
          description={currentResult.message}
        />
      </section>
    );
  }

  const viewCardColumnIndex = viewCard ? currentColumns.findIndex((column) => column.id === viewCard.kanbanColumnId) : -1;
  const viewCardCurrentColumn = viewCardColumnIndex >= 0 ? currentColumns[viewCardColumnIndex] : null;
  const viewCardNextColumn = viewCardColumnIndex >= 0 ? currentColumns[viewCardColumnIndex + 1] : null;
  const viewCardImageUrl = viewCard ? getCloudinaryThumbnailUrl(viewCard.thumbUrl, 640, 360) : null;

  return (
    <>
      <section className="quadro-producao-view" aria-labelledby="quadro-producao-toolbar-title">
        <header aria-hidden="true" className="quadro-producao-view__header" hidden>
          <div className="page-heading">
            <div className="page-heading__copy">
              <Badge tone="info">Quadro</Badge>
              <h1 id="quadro-producao-title" className="app-title">
                Quadro de Produção
              </h1>
            </div>
            <div className="quadro-producao-header-actions">
              <button
                className="ui-button ui-button--secondary"
                onClick={() => {
                  setManualCardDraft(getEmptyManualCardDraft(defaultColumnId));
                  setCreateManualCardOpen(true);
                }}
                type="button"
              >
                <Rows3 aria-hidden="true" size={16} />
                Novo cartão
              </button>
              <button className="ui-button ui-button--primary" onClick={() => setCreateColumnOpen(true)} type="button">
                <Plus aria-hidden="true" size={18} />
                Nova coluna
              </button>
            </div>
          </div>
        </header>

        <Card className="quadro-producao-toolbar-card">
          <div className="quadro-producao-toolbar">
            <div className="quadro-producao-toolbar__title">
              <div>
                <h1 id="quadro-producao-toolbar-title" className="app-title quadro-producao-toolbar__heading">
                  Quadro de Produção
                </h1>
              </div>
              <Badge tone="info">{formatCount(currentTotalVisible)} em aberto</Badge>
            </div>

            <label className="quadro-producao-field quadro-producao-field--search">
              <span>Busca</span>
              <div className="quadro-producao-search-wrap">
                <Filter aria-hidden="true" size={16} />
                <input
                  aria-label="Buscar no quadro"
                  className="quadro-producao-input"
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Cliente, venda, tecido, arte..."
                  value={searchDraft}
                />
                {searchDraft.trim() ? (
                  <button
                    aria-label="Limpar busca"
                    className="quadro-producao-search-clear"
                    onClick={() => setSearchDraft("")}
                    onMouseDown={(event) => event.preventDefault()}
                    type="button"
                  >
                    <X aria-hidden="true" size={16} />
                  </button>
                ) : null}
              </div>
            </label>

            <div className="quadro-producao-toolbar-actions">
              <Tooltip label="Mostrar apenas fichas com entrega nesta semana">
                <button
                  aria-pressed={filters.semana}
                  className={`ui-button ui-button--secondary quadro-producao-week-toggle${filters.semana ? " is-active" : ""}`}
                  onClick={() => void setFilters({ semana: filters.semana ? null : true })}
                  type="button"
                >
                  <CalendarDays aria-hidden="true" size={16} />
                  Para essa semana
                </button>
              </Tooltip>
              <Tooltip label="Remover todos os filtros do quadro">
                <button className="ui-button ui-button--ghost" onClick={handleClearFilters} type="button">
                  Limpar filtros
                </button>
              </Tooltip>
              <Tooltip label="Recarregar dados do quadro">
                <button className="ui-button ui-button--secondary" onClick={handleRefresh} type="button">
                  <RefreshCw
                    aria-hidden="true"
                    className={boardQuery.isFetching ? "quadro-producao-spin" : undefined}
                    size={16}
                  />
                  Atualizar
                </button>
              </Tooltip>
              <Tooltip label="Criar um cartão manual no quadro">
                <button
                  className="ui-button ui-button--secondary quadro-producao-toolbar-actions__new-card"
                  onClick={() => {
                    setManualCardDraft(getEmptyManualCardDraft(defaultColumnId));
                    setCreateManualCardOpen(true);
                  }}
                  type="button"
                >
                  <Rows3 aria-hidden="true" size={16} />
                  Novo cartão
                </button>
              </Tooltip>
              <Tooltip label="Criar nova coluna no quadro">
                <button
                  className="ui-button ui-button--ghost quadro-producao-toolbar-actions__quiet"
                  onClick={() => setCreateColumnOpen(true)}
                  type="button"
                >
                  <Plus aria-hidden="true" size={16} />
                  Coluna
                </button>
              </Tooltip>
            </div>

            <div aria-label="Filtrar por personalização" className="quadro-producao-tabs" role="tablist">
              <button
                aria-selected={!filters.arte}
                className="quadro-producao-tab"
                data-active={!filters.arte ? "true" : "false"}
                onClick={() => void setFilters({ arte: null })}
                role="tab"
                type="button"
              >
                Todos
              </button>
              {currentResult.snapshot.filterOptions.artes.map((arte) => (
                <button
                  aria-selected={filters.arte === arte}
                  className="quadro-producao-tab"
                  data-active={filters.arte === arte ? "true" : "false"}
                  key={arte}
                  onClick={() => void setFilters({ arte })}
                  role="tab"
                  type="button"
                >
                  {normalizePersonalizacaoLabel(arte)}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <KanbanDragProvider
          activeCardDrag={activeCardDrag}
          cardsByColumn={visibleCardsByColumn}
          onActiveCardDragChange={setActiveCardDrag}
          onCardMoveSyncHoldChange={setCardMoveSyncHold}
          onCardsByColumnChange={setCardsByColumn}
          onPersistCardMove={handlePersistDragMove}
        >
          <div className="quadro-producao-board-scroll">
            <div className="quadro-producao-board">
              {kanbanColumns.map((column, index) => (
                <ColumnSurface
                  column={column}
                  currentColumns={kanbanColumns}
                  index={index}
                  insumoMutationPending={insumoMutation.isPending}
                  deliverMutationPending={deliverCardMutation.isPending}
                  key={column.id}
                  isCardDragging={Boolean(activeCardDrag)}
                  onChangeInsumo={handleChangeInsumo}
                  onDeliverCard={handleDeliverCard}
                  onMoveNextCard={(card) => {
                    const nextColumn = kanbanColumns[index + 1];
                    if (!nextColumn) {
                      return;
                    }

                    handleMoveCard({
                      cardId: card.id,
                      destinationColumnId: nextColumn.id,
                      destinationIndex: nextColumn.openCount,
                    });
                  }}
                  onOpenRename={handleOpenRenameModal}
                  onOpenView={setViewCard}
                  onShiftColumn={handleColumnShift}
                  onSortByDate={(columnId) => sortColumnMutation.mutate(columnId)}
                />
              ))}
            </div>
          </div>
        </KanbanDragProvider>
      </section>

      {createColumnOpen ? (
        <Modal onClose={() => setCreateColumnOpen(false)} size="sm" title="Nova coluna">
          <section className="confirm-dialog">
            <header className="confirm-dialog__header">
              <div>
                <span className="confirm-dialog__eyebrow">Coluna do quadro</span>
                <h2>Criar nova coluna</h2>
              </div>
            </header>

            <form className="quadro-producao-modal-form" onSubmit={handleCreateColumnSubmit}>
              <label className="quadro-producao-field">
                <span>Nome da coluna</span>
                <input
                  className="quadro-producao-input"
                  onChange={(event) => setCreateColumnName(event.target.value)}
                  placeholder="Ex.: Revisão final"
                  value={createColumnName}
                />
              </label>

              <div className="confirm-dialog__actions">
                <button className="ui-button ui-button--ghost" onClick={() => setCreateColumnOpen(false)} type="button">
                  Cancelar
                </button>
                <button className="ui-button ui-button--primary" disabled={createColumnMutation.isPending} type="submit">
                  {createColumnMutation.isPending ? "Criando..." : "Criar coluna"}
                </button>
              </div>
            </form>
          </section>
        </Modal>
      ) : null}

      {renameTarget ? (
        <Modal onClose={() => setRenameTarget(null)} size="sm" title="Renomear coluna">
          <section className="confirm-dialog">
            <header className="confirm-dialog__header">
              <div>
                <span className="confirm-dialog__eyebrow">Coluna do quadro</span>
                <h2>Renomear coluna</h2>
              </div>
            </header>

            <form className="quadro-producao-modal-form" onSubmit={handleRenameColumnSubmit}>
              <label className="quadro-producao-field">
                <span>Novo nome</span>
                <input
                  className="quadro-producao-input"
                  onChange={(event) => setRenameColumnName(event.target.value)}
                  value={renameColumnName}
                />
              </label>

              <div className="confirm-dialog__actions">
                <button className="ui-button ui-button--ghost" onClick={() => setRenameTarget(null)} type="button">
                  Cancelar
                </button>
                <button className="ui-button ui-button--primary" disabled={renameColumnMutation.isPending} type="submit">
                  {renameColumnMutation.isPending ? "Salvando..." : "Salvar nome"}
                </button>
              </div>
            </form>
          </section>
        </Modal>
      ) : null}

      {createManualCardOpen ? (
        <Modal onClose={() => setCreateManualCardOpen(false)} size="md" title="Novo cartão manual">
          <section className="confirm-dialog">
            <header className="confirm-dialog__header">
              <div>
                <span className="confirm-dialog__eyebrow">Cartão</span>
                <h2>Novo cartão manual</h2>
              </div>
            </header>

            <form className="quadro-producao-modal-form quadro-producao-modal-form--grid" onSubmit={handleManualCardSubmit}>
              <label className="quadro-producao-field quadro-producao-field--full">
                <span>Título</span>
                <input
                  className="quadro-producao-input"
                  onChange={(event) => handleManualDraftChange("title", event.target.value)}
                  placeholder="Ex.: Camisetas evento interno"
                  value={manualCardDraft.title}
                />
              </label>

              <label className="quadro-producao-field">
                <span>Entrega</span>
                <input
                  className="quadro-producao-input"
                  onChange={(event) => handleManualDraftChange("dataEntrega", event.target.value)}
                  type="date"
                  value={manualCardDraft.dataEntrega}
                />
              </label>

              <label className="quadro-producao-field">
                <span>Coluna inicial</span>
                <select
                  className="quadro-producao-select"
                  onChange={(event) => handleManualDraftChange("columnId", event.target.value)}
                  value={manualCardDraft.columnId}
                >
                  {currentColumns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.displayName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="quadro-producao-field">
                <span>Arte</span>
                <input
                  className="quadro-producao-input"
                  onChange={(event) => handleManualDraftChange("arte", event.target.value)}
                  placeholder="Ex.: Serigrafia"
                  value={manualCardDraft.arte}
                />
              </label>

              <label className="quadro-producao-field">
                <span>Tecido</span>
                <input
                  className="quadro-producao-input"
                  onChange={(event) => handleManualDraftChange("material", event.target.value)}
                  placeholder="Ex.: Helanca"
                  value={manualCardDraft.material}
                />
              </label>

              <label className="quadro-producao-field">
                <span>Status da ficha</span>
                <select
                  className="quadro-producao-select"
                  onChange={(event) => handleManualDraftChange("insumoStatus", event.target.value as InsumoStatus)}
                  value={manualCardDraft.insumoStatus}
                >
                  {Object.entries(INSUMO_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="quadro-producao-checkbox">
                <input
                  checked={manualCardDraft.evento}
                  onChange={(event) => handleManualDraftChange("evento", event.target.checked)}
                  type="checkbox"
                />
                <span>É um pedido de evento</span>
              </label>

              <div className="confirm-dialog__actions">
                <button className="ui-button ui-button--ghost" onClick={() => setCreateManualCardOpen(false)} type="button">
                  Cancelar
                </button>
                <button className="ui-button ui-button--primary" disabled={createManualCardMutation.isPending} type="submit">
                  {createManualCardMutation.isPending ? "Criando..." : "Criar cartão"}
                </button>
              </div>
            </form>
          </section>
        </Modal>
      ) : null}

      {viewCard ? (
        <Modal onClose={() => setViewCard(null)} size="md" title="Detalhes do cartão">
          <section className="quadro-producao-view-modal">
            <div className="quadro-producao-view-modal__media">
              {viewCardImageUrl ? (
                <Image
                  alt={`Imagem da ficha de ${viewCard.clienteNome}`}
                  className="quadro-producao-view-modal__image"
                  height={360}
                  src={viewCardImageUrl}
                  width={640}
                />
              ) : (
                <div className="quadro-producao-view-modal__image-placeholder">
                  Sem imagem
                </div>
              )}
            </div>

            <div className="quadro-producao-view-modal__content">
              <header className="quadro-producao-view-modal__header">
                <div>
                  <h2>{viewCard.clienteNome}</h2>
                </div>
                <div className="quadro-producao-view-modal__tags">
                  <Badge tone="neutral">{viewCardCurrentColumn?.displayName ?? "Sem coluna"}</Badge>
                  <Badge tone="neutral">{formatDateLong(viewCard.dataEntrega)}</Badge>
                  {viewCard.evento ? <Badge tone="info">Evento</Badge> : null}
                </div>
              </header>

              <dl className="quadro-producao-view-grid">
                <div>
                  <dt>Arte</dt>
                  <dd>{normalizePersonalizacaoLabel(viewCard.arte)}</dd>
                </div>
                <div>
                  <dt>Tecido</dt>
                  <dd>{viewCard.material || "Não informado"}</dd>
                </div>
                <div>
                  <dt>Venda</dt>
                  <dd>{viewCard.numeroVenda || "Sem número"}</dd>
                </div>
                <div>
                  <dt>Responsável</dt>
                  <dd>{viewCard.vendedor || "Sem responsável"}</dd>
                </div>
              </dl>

              <div className="quadro-producao-view-modal__actions">
                <label className="quadro-producao-view-modal__status quadro-producao-status-chip" data-status={viewCard.insumoStatus}>
                  <span>Status da ficha</span>
                  <select
                    aria-label={`Status da ficha de ${viewCard.clienteNome}`}
                    disabled={insumoMutation.isPending}
                    onChange={(event) => {
                      const insumoStatus = event.target.value as InsumoStatus;
                      setViewCard((current) => (current ? { ...current, insumoStatus } : current));
                      insumoMutation.mutate({
                        cardId: viewCard.id,
                        insumoStatus,
                      });
                    }}
                    value={viewCard.insumoStatus}
                  >
                    {INSUMO_STATUS_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {INSUMO_STATUS_LABELS[value as InsumoStatus]}
                      </option>
                    ))}
                  </select>
                </label>

                <Tooltip label={viewCardNextColumn ? `Mover para ${viewCardNextColumn.displayName}` : "Marcar pedido como entregue"}>
                  <button
                    aria-label={viewCardNextColumn ? `Mover ${viewCard.clienteNome} para ${viewCardNextColumn.displayName}` : `Marcar pedido de ${viewCard.clienteNome} como entregue`}
                    className={`ui-button ui-button--primary quadro-producao-view-modal__move${viewCardNextColumn ? "" : " quadro-producao-view-modal__move--deliver"}`}
                    disabled={viewCardNextColumn ? moveCardMutation.isPending : deliverCardMutation.isPending}
                    onClick={() => {
                      if (!viewCardNextColumn) {
                        handleDeliverCard(viewCard);
                        setViewCard(null);
                        return;
                      }

                      handleMoveCard({
                        cardId: viewCard.id,
                        destinationColumnId: viewCardNextColumn.id,
                        destinationIndex: viewCardNextColumn.openCount,
                      });
                      setViewCard({
                        ...viewCard,
                        kanbanColumnId: viewCardNextColumn.id,
                        kanbanOrder: viewCardNextColumn.openCount,
                      });
                    }}
                    type="button"
                  >
                    {viewCardNextColumn ? <ArrowRight aria-hidden="true" size={16} /> : <Check aria-hidden="true" size={16} />}
                    {viewCardNextColumn ? "Mover para próxima etapa" : "Marcar entregue"}
                  </button>
                </Tooltip>
              </div>
            </div>
          </section>
        </Modal>
      ) : null}

    </>
  );
}

type KanbanDragProviderProps = {
  activeCardDrag: KanbanDragSource | null;
  cardsByColumn: KanbanCardsByColumn;
  children: ReactNode;
  onActiveCardDragChange: Dispatch<SetStateAction<KanbanDragSource | null>>;
  onCardsByColumnChange: Dispatch<SetStateAction<KanbanCardsByColumn>>;
  onCardMoveSyncHoldChange: Dispatch<SetStateAction<boolean>>;
  onPersistCardMove: (
    move: { cardId: string; destinationColumnId: string; destinationIndex: number },
    snapshot: KanbanCardsByColumn,
  ) => void;
};

function KanbanDragProvider({
  activeCardDrag,
  cardsByColumn,
  children,
  onActiveCardDragChange,
  onCardsByColumnChange,
  onCardMoveSyncHoldChange,
  onPersistCardMove,
}: KanbanDragProviderProps) {
  const dragStateRef = useRef(activeCardDrag);
  const cardsByColumnRef = useRef(cardsByColumn);
  const lastDragDestinationRef = useRef<KanbanDragDestination | null>(null);
  const pendingStateFlushTimeoutRef = useRef<number | null>(null);
  const pendingCardsByColumnRef = useRef<KanbanCardsByColumn | null>(null);
  const pendingActiveCardDragRef = useRef<KanbanDragSource | null | undefined>(undefined);

  useEffect(() => {
    dragStateRef.current = activeCardDrag;
  }, [activeCardDrag]);

  useEffect(() => {
    cardsByColumnRef.current = cardsByColumn;
  }, [cardsByColumn]);

  useEffect(() => {
    return () => {
      if (pendingStateFlushTimeoutRef.current) {
        window.cancelAnimationFrame(pendingStateFlushTimeoutRef.current);
      }
    };
  }, []);

  const scheduleProviderStateFlush = useCallback(() => {
    if (pendingStateFlushTimeoutRef.current) {
      return;
    }

    pendingStateFlushTimeoutRef.current = window.requestAnimationFrame(() => {
      pendingStateFlushTimeoutRef.current = null;

      const nextCardsByColumn = pendingCardsByColumnRef.current;
      const nextActiveCardDrag = pendingActiveCardDragRef.current;

      pendingCardsByColumnRef.current = null;
      pendingActiveCardDragRef.current = undefined;

      if (nextCardsByColumn) {
        logKanbanDnd("state.flush-cards", {
          visible: summarizeCardsByColumn(nextCardsByColumn),
        });
        onCardsByColumnChange(nextCardsByColumn);
      }

      if (nextActiveCardDrag !== undefined) {
        if (nextActiveCardDrag === null && nextCardsByColumn) {
          window.setTimeout(() => {
            logKanbanDnd("state.flush-active", {
              cardId: null,
            });
            onActiveCardDragChange(null);
          }, 0);
        } else {
          logKanbanDnd("state.flush-active", {
            cardId: nextActiveCardDrag?.cardId ?? null,
          });
          onActiveCardDragChange(nextActiveCardDrag);
        }
      }
    });
  }, [onActiveCardDragChange, onCardsByColumnChange]);

  const scheduleCardsByColumnChange = useCallback((nextCardsByColumn: KanbanCardsByColumn) => {
    cardsByColumnRef.current = nextCardsByColumn;
    pendingCardsByColumnRef.current = nextCardsByColumn;
    scheduleProviderStateFlush();
  }, [scheduleProviderStateFlush]);

  const scheduleActiveCardDragChange = useCallback((nextActiveCardDrag: KanbanDragSource | null) => {
    dragStateRef.current = nextActiveCardDrag;
    pendingActiveCardDragRef.current = nextActiveCardDrag;
    scheduleProviderStateFlush();
  }, [scheduleProviderStateFlush]);

  return (
    <DragDropProvider
      plugins={(defaults) => [
        ...defaults,
        Feedback.configure({ dropAnimation: null }),
      ]}
      onDragStart={(event) => {
        const source = event.operation.source;
        const cardId = source?.id != null ? String(source.id) : null;

        if (!cardId) {
          return;
        }

        const snapshot = cloneCardsByColumn(cardsByColumnRef.current);
        const location = findCardLocation(snapshot, cardId);

        if (!location) {
          return;
        }

        const initialDestination = {
          columnId: location.columnId,
          index: location.index,
        };
        cardsByColumnRef.current = snapshot;
        lastDragDestinationRef.current = initialDestination;
        logKanbanDnd("drag.start", {
          cardId,
          source: initialDestination,
        });
        window.setTimeout(() => {
          onCardMoveSyncHoldChange(true);
        }, 0);
        scheduleCardsByColumnChange(snapshot);
        const dragState: KanbanDragSource = {
          cardId,
          snapshot,
          sourceColumnId: location.columnId,
          sourceIndex: location.index,
        };
        scheduleActiveCardDragChange(dragState);
      }}
      onDragOver={(event) => {
        const dragSource = dragStateRef.current;

        if (!dragSource) {
          return;
        }

        const { target } = event.operation;
        const destination =
          getSortableDroppableDestination(target) ??
          getColumnDestination(target, cardsByColumnRef.current);

        if (!destination || areDragDestinationsEqual(lastDragDestinationRef.current, destination)) {
          return;
        }

        const previousDestination = lastDragDestinationRef.current;
        lastDragDestinationRef.current = destination;
        logKanbanDnd("drag.over", {
          cardId: dragSource.cardId,
          destination,
          previousDestination,
        });

        const next = moveCardInCardsByColumn(cardsByColumnRef.current, {
          cardId: dragSource.cardId,
          destinationColumnId: destination.columnId,
          destinationIndex: destination.index,
        });

        if (next !== cardsByColumnRef.current) {
          scheduleCardsByColumnChange(next);
        }
      }}
      onDragEnd={(event) => {
        const dragSource = dragStateRef.current;

        if (!dragSource) {
          return;
        }

        const lastDestination = lastDragDestinationRef.current;
        lastDragDestinationRef.current = null;

        if (event.canceled) {
          logKanbanDnd("drag.cancel", {
            cardId: dragSource.cardId,
            restored: true,
          });
          scheduleCardsByColumnChange(dragSource.snapshot);
          scheduleActiveCardDragChange(null);
          window.setTimeout(() => {
            onCardMoveSyncHoldChange(false);
          }, 0);
          return;
        }

        const { source } = event.operation;
        const currentLocation = findCardLocation(cardsByColumnRef.current, dragSource.cardId);
        const fallbackDestination =
          getSortableDraggableDestination(source) ??
          (currentLocation
            ? { columnId: currentLocation.columnId, index: currentLocation.index }
            : null);
        const destination = lastDestination ?? fallbackDestination;

        if (!destination) {
          logKanbanDnd("drag.end-no-destination", {
            cardId: dragSource.cardId,
          });
          scheduleCardsByColumnChange(dragSource.snapshot);
          scheduleActiveCardDragChange(null);
          window.setTimeout(() => {
            onCardMoveSyncHoldChange(false);
          }, 0);
          return;
        }

        const destinationColumnId = destination.columnId;
        const destinationIndex = destination.index;
        const { cardId } = dragSource;

        const nextCardsByColumn = moveCardInCardsByColumn(cardsByColumnRef.current, {
          cardId,
          destinationColumnId,
          destinationIndex,
        });
        logKanbanDnd("drag.end", {
          cardId,
          destination,
          persisted: dragSource.sourceColumnId !== destinationColumnId || dragSource.sourceIndex !== destinationIndex,
          source: {
            columnId: dragSource.sourceColumnId,
            index: dragSource.sourceIndex,
          },
        });
        scheduleCardsByColumnChange(nextCardsByColumn);

        if (dragSource.sourceColumnId !== destinationColumnId || dragSource.sourceIndex !== destinationIndex) {
          onPersistCardMove(
            { cardId, destinationColumnId, destinationIndex },
            dragSource.snapshot,
          );
        } else {
          scheduleActiveCardDragChange(null);
          window.setTimeout(() => {
            onCardMoveSyncHoldChange(false);
          }, 0);
        }
      }}
    >
      {children}
    </DragDropProvider>
  );
}

type ColumnSurfaceProps = {
  column: KanbanBoardColumn;
  currentColumns: KanbanBoardColumn[];
  index: number;
  isCardDragging: boolean;
  insumoMutationPending: boolean;
  deliverMutationPending: boolean;
  onChangeInsumo: (card: KanbanCardSummary, insumoStatus: InsumoStatus) => void;
  onDeliverCard: (card: KanbanCardSummary) => void;
  onMoveNextCard: (card: KanbanCardSummary) => void;
  onOpenRename: (column: KanbanBoardColumn) => void;
  onOpenView: (card: KanbanCardSummary) => void;
  onShiftColumn: (columnId: string, direction: "left" | "right") => void;
  onSortByDate: (columnId: string) => void;
};

type CardImagePreviewButtonProps = {
  card: KanbanCardSummary;
  isCardDragging: boolean;
  onOpenView: (card: KanbanCardSummary) => void;
};

function CardImagePreviewButton({ card, isCardDragging, onOpenView }: CardImagePreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const thumbnailUrl = getCloudinaryThumbnailUrl(card.thumbUrl);
  const closePreview = useCallback(() => {
    setOpen(false);
    setPosition(null);
  }, []);

  const updatePointerPosition = useCallback((clientX: number, clientY: number) => {
    const preview = previewRef.current;
    const previewWidth = preview?.offsetWidth ?? 252;
    const previewHeight = preview?.offsetHeight ?? 150;
    const viewportPadding = 8;
    const pointerOffset = 16;
    const maxLeft = window.innerWidth - previewWidth - viewportPadding;
    const maxTop = window.innerHeight - previewHeight - viewportPadding;
    const left = Math.min(clientX + pointerOffset, maxLeft);
    const top = Math.min(clientY + pointerOffset, maxTop);

    setPosition({
      left: Math.max(viewportPadding, left),
      top: Math.max(viewportPadding, top),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || position) {
      return;
    }

    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    updatePointerPosition(triggerRect.right, triggerRect.bottom);
  }, [open, position, updatePointerPosition]);

  return (
    <>
      <button
        aria-label={`Abrir detalhes de ${card.clienteNome}`}
        className="quadro-producao-icon-button quadro-producao-image-preview-trigger"
        onBlur={closePreview}
        onClick={() => {
          if (isCardDragging) {
            closePreview();
            return;
          }
          onOpenView(card);
        }}
        onFocus={() => {
          if (isCardDragging) {
            closePreview();
            return;
          }
          setOpen(true);
        }}
        onMouseDown={stopKanbanCardDrag}
        onPointerEnter={(event) => {
          if (isCardDragging) {
            closePreview();
            return;
          }
          setOpen(true);
          updatePointerPosition(event.clientX, event.clientY);
        }}
        onPointerDown={stopKanbanCardDrag}
        onPointerLeave={closePreview}
        onPointerMove={(event) => {
          if (isCardDragging) {
            closePreview();
            return;
          }
          updatePointerPosition(event.clientX, event.clientY);
        }}
        ref={triggerRef}
        type="button"
      >
        <Eye aria-hidden="true" size={16} />
      </button>
      {typeof document !== "undefined" && open && thumbnailUrl
        ? createPortal(
            <div
              className="quadro-producao-image-preview"
              ref={previewRef}
              role="tooltip"
              style={position ?? undefined}
            >
              <Image alt="" height={180} src={thumbnailUrl} width={320} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function ColumnSurface({
  column,
  currentColumns,
  index,
  isCardDragging,
  insumoMutationPending,
  deliverMutationPending,
  onChangeInsumo,
  onDeliverCard,
  onMoveNextCard,
  onOpenRename,
  onOpenView,
  onShiftColumn,
  onSortByDate,
}: ColumnSurfaceProps) {
  const { isDropTarget, ref: droppableRef } = useDroppable({
    accept: "card",
    collisionPriority: 1,
    id: column.id,
    type: "column",
  });

  return (
    <section className="quadro-producao-column" style={getColumnAccentStyle(column.order_index)}>
      <header className="quadro-producao-column__header">
        <div className="quadro-producao-column__topline">
          <div className="quadro-producao-column__heading">
            <GripVertical aria-hidden="true" className="quadro-producao-column__grip" size={14} />
            <h2>{column.displayName}</h2>
          </div>
          <Badge tone="neutral">{formatCount(column.openCount)}</Badge>
        </div>

        <div className="quadro-producao-column__actions">
            <Tooltip label="Mover coluna para a esquerda">
              <button
                aria-label="Mover coluna para a esquerda"
                className="quadro-producao-icon-button"
                disabled={index === 0}
                onClick={() => onShiftColumn(column.id, "left")}
                type="button"
              >
                <ArrowLeft aria-hidden="true" size={16} />
              </button>
            </Tooltip>
            <Tooltip label="Mover coluna para a direita">
              <button
                aria-label="Mover coluna para a direita"
                className="quadro-producao-icon-button"
                disabled={index === currentColumns.length - 1}
                onClick={() => onShiftColumn(column.id, "right")}
                type="button"
              >
                <ArrowRight aria-hidden="true" size={16} />
              </button>
            </Tooltip>
            <Tooltip label="Ordenar cartões por entrega">
              <button
                aria-label="Ordenar cartões por entrega"
                className="quadro-producao-icon-button"
                onClick={() => onSortByDate(column.id)}
                type="button"
              >
                <CalendarDays aria-hidden="true" size={16} />
              </button>
            </Tooltip>
            <Tooltip label="Renomear coluna">
              <button
                aria-label="Renomear coluna"
                className="quadro-producao-icon-button"
                onClick={() => onOpenRename(column)}
                type="button"
              >
                <Pencil aria-hidden="true" size={16} />
              </button>
            </Tooltip>
        </div>
      </header>

      <div
        className={`quadro-producao-column__list${isDropTarget ? " quadro-producao-column__list--droppable" : ""}`}
        ref={droppableRef}
      >
        {column.cards.length === 0 ? <div className="quadro-producao-empty-column">Nenhum cartão nesta etapa.</div> : null}
        {column.cards.map((card, cardIndex) => (
          <KanbanCard
            card={card}
            cardIndex={cardIndex}
            columnId={column.id}
            deliverMutationPending={deliverMutationPending}
            insumoMutationPending={insumoMutationPending}
            isCardDragging={isCardDragging}
            isLastColumn={index === currentColumns.length - 1}
            key={card.id}
            onChangeInsumo={onChangeInsumo}
            onDeliverCard={onDeliverCard}
            onMoveNextCard={onMoveNextCard}
            onOpenView={onOpenView}
          />
        ))}
      </div>
    </section>
  );
}

type KanbanCardProps = {
  card: KanbanCardSummary;
  cardIndex: number;
  columnId: string;
  deliverMutationPending: boolean;
  insumoMutationPending: boolean;
  isCardDragging: boolean;
  isLastColumn: boolean;
  onChangeInsumo: (card: KanbanCardSummary, insumoStatus: InsumoStatus) => void;
  onDeliverCard: (card: KanbanCardSummary) => void;
  onMoveNextCard: (card: KanbanCardSummary) => void;
  onOpenView: (card: KanbanCardSummary) => void;
};

const KanbanCard = memo(function KanbanCard({
  card,
  cardIndex,
  columnId,
  deliverMutationPending,
  insumoMutationPending,
  isCardDragging,
  isLastColumn,
  onChangeInsumo,
  onDeliverCard,
  onMoveNextCard,
  onOpenView,
}: KanbanCardProps) {
  const { handleRef, isDragging, isDropping, ref } = useSortable({
    accept: "card",
    data: {
      cardId: card.id,
    },
    group: columnId,
    id: card.id,
    index: cardIndex,
    // React owns the list order while dragging; this avoids DOM sorting competing with state reparenting.
    plugins: [SortableKeyboardPlugin],
    transition: null,
    type: "card",
  });
  const deliveryUrgency = getDeliveryUrgency(card);

  return (
    <article
      className={`quadro-producao-card${isDragging || isDropping ? " quadro-producao-card--dragging" : ""}`}
      data-card-id={card.id}
      data-index={cardIndex}
      ref={ref}
    >
      <div className="quadro-producao-card__body" data-dnd-handle="true" ref={handleRef}>
        <div className="quadro-producao-card__identity">
          <button
            aria-label={`Abrir detalhes de ${card.clienteNome}`}
            className="quadro-producao-card__title"
            onClick={() => onOpenView(card)}
            onMouseDown={stopKanbanCardDrag}
            onPointerDown={stopKanbanCardDrag}
            type="button"
          >
            {card.evento ? (
              <span aria-label="Pedido de evento" className="quadro-producao-card__event-chip" role="img">
                <Star aria-hidden="true" size={11} />
              </span>
            ) : null}
            <span className="quadro-producao-card__title-text">{card.clienteNome}</span>
          </button>
        </div>

        <div className="quadro-producao-card__meta">
          <span className="quadro-producao-card__chip">{normalizePersonalizacaoLabel(card.arte)}</span>
          <label className="quadro-producao-status-chip" data-status={card.insumoStatus}>
            <span className="sr-only">Status da ficha de {card.clienteNome}</span>
            <select
              aria-label={`Status da ficha de ${card.clienteNome}`}
              disabled={insumoMutationPending}
              onChange={(event) => onChangeInsumo(card, event.target.value as InsumoStatus)}
              onClick={stopKanbanCardDrag}
              onMouseDown={stopKanbanCardDrag}
              onMouseDownCapture={stopKanbanCardDrag}
              onPointerDown={stopKanbanCardDrag}
              onPointerDownCapture={stopKanbanCardDrag}
              onTouchStartCapture={stopKanbanCardDrag}
              value={card.insumoStatus}
            >
              {INSUMO_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {INSUMO_STATUS_LABELS[value as InsumoStatus]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="quadro-producao-card__delivery" data-urgency={deliveryUrgency}>
          <CalendarDays aria-hidden="true" size={13} />
          <span
            aria-label={getDeliveryUrgencyLabel(deliveryUrgency)}
            className="quadro-producao-card__delivery-dot"
            role="img"
          />
          <span>Entrega {formatDate(card.dataEntrega)}</span>
        </div>

        <div className="quadro-producao-card__footer">
          <div className="quadro-producao-card__actions">
            <CardImagePreviewButton card={card} isCardDragging={isCardDragging} onOpenView={onOpenView} />
            {isLastColumn ? (
              <Tooltip label="Marcar pedido como entregue">
                <button
                  aria-label={`Marcar pedido de ${card.clienteNome} como entregue`}
                  className="quadro-producao-icon-button quadro-producao-icon-button--deliver"
                  disabled={deliverMutationPending}
                  onClick={() => onDeliverCard(card)}
                  onMouseDown={stopKanbanCardDrag}
                  onPointerDown={stopKanbanCardDrag}
                  type="button"
                >
                  <Check aria-hidden="true" size={16} />
                </button>
              </Tooltip>
            ) : (
              <Tooltip label="Mover para a próxima coluna">
                <button
                  aria-label={`Mover ${card.clienteNome} para a próxima coluna`}
                  className="quadro-producao-icon-button quadro-producao-icon-button--success"
                  onClick={() => onMoveNextCard(card)}
                  onMouseDown={stopKanbanCardDrag}
                  onPointerDown={stopKanbanCardDrag}
                  type="button"
                >
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});
