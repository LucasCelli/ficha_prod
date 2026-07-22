"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type FormEvent,
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
import { Feedback, type Droppable } from "@dnd-kit/dom";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleHelp,
  Eye,
  Filter,
  GripVertical,
  Pencil,
  Package,
  Plus,
  RefreshCw,
  Search,
  Star,
  X,
} from "lucide-react";
import { Button, Modal, Tooltip } from "@/components/ui";
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

type DragStart = {
  cardId: string;
  columnId: string;
  index: number;
};

type DragDestination = {
  columnId: string;
  index: number;
};

const BOARD_QUERY_KEY = "quadro-producao";
const DND_TIMING = {
  duration: 130,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
};
const CARD_SORTABLE_PLUGINS = [
  SortableKeyboardPlugin,
  Feedback.configure({
    dropAnimation: DND_TIMING,
  }),
];

function formatDate(value: string) {
  return formatShortDateInput(value);
}

function formatDateLong(value: string) {
  return formatDateInput(value, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function getDeliveryUrgency(card: KanbanCardSummary) {
  if (card.kanbanStatus === "na_costura") {
    return "default";
  }

  const remainingDays = getDateInputDifferenceInDays(card.dataEntrega);

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
  if (urgency === "danger") return "Entrega atrasada ou em risco imediato";
  if (urgency === "warning") return "Entrega proxima";
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

function getResultColumns(result: QuadroProducaoResult) {
  return result.kind === "ok" ? result.snapshot.columns : [];
}

function cloneColumns(columns: KanbanBoardColumn[]) {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.map((card) => ({ ...card })),
  }));
}

function normalizeColumnCounts(columns: KanbanBoardColumn[]) {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.map((card, index) => ({
      ...card,
      kanbanColumnId: column.id,
      kanbanOrder: index,
    })),
    openCount: column.cards.length,
  }));
}

function findCardLocation(columns: KanbanBoardColumn[], cardId: string): DragDestination | null {
  for (const column of columns) {
    const index = column.cards.findIndex((card) => card.id === cardId);

    if (index >= 0) {
      return { columnId: column.id, index };
    }
  }

  return null;
}

function moveCard(columns: KanbanBoardColumn[], cardId: string, destination: DragDestination) {
  const next = cloneColumns(columns);
  const source = findCardLocation(next, cardId);

  if (!source) {
    return columns;
  }

  const sourceColumn = next.find((column) => column.id === source.columnId);
  const destinationColumn = next.find((column) => column.id === destination.columnId);

  if (!sourceColumn || !destinationColumn) {
    return columns;
  }

  const [card] = sourceColumn.cards.splice(source.index, 1);

  if (!card) {
    return columns;
  }

  const sameColumn = sourceColumn.id === destinationColumn.id;
  const insertAt = Math.max(0, Math.min(destination.index, destinationColumn.cards.length));
  destinationColumn.cards.splice(insertAt, 0, sameColumn ? card : { ...card, kanbanColumnId: destinationColumn.id });

  return normalizeColumnCounts(next);
}

function getDestination(target: Droppable | null, columns: KanbanBoardColumn[]): DragDestination | null {
  if (isSortable(target) && target.group != null) {
    return {
      columnId: String(target.group),
      index: Math.max(0, target.index),
    };
  }

  if (target?.id != null) {
    const columnId = String(target.id);
    const column = columns.find((item) => item.id === columnId);

    if (column) {
      return {
        columnId,
        index: column.cards.length,
      };
    }
  }

  return null;
}

function sameDestination(left: DragDestination | null, right: DragDestination | null) {
  return left?.columnId === right?.columnId && left?.index === right?.index;
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

function stopCardDrag(event: { nativeEvent?: Event; stopPropagation: () => void }) {
  event.nativeEvent?.stopImmediatePropagation();
  event.stopPropagation();
}

function getColumnAccentStyle(orderIndex: number): CSSProperties {
  const accents = [
    "var(--color-primary)",
    "var(--color-primary)",
    "var(--color-info)",
    "var(--color-primary)",
    "var(--color-success)",
  ];

  return {
    "--quadro-column-accent": accents[((orderIndex % accents.length) + accents.length) % accents.length],
  } as CSSProperties;
}

function updateQueryResult(
  result: QuadroProducaoResult | undefined,
  updater: (columns: KanbanBoardColumn[]) => KanbanBoardColumn[],
) {
  if (!result || result.kind !== "ok") {
    return result;
  }

  const columns = updater(result.snapshot.columns);

  return {
    ...result,
    snapshot: {
      ...result.snapshot,
      columns,
      totalVisible: columns.reduce((total, column) => total + column.openCount, 0),
    },
  } satisfies QuadroProducaoResult;
}

export function QuadroProducaoClient({ initialFilters, initialResult }: QuadroProducaoClientProps) {
  const [filters, setFilters] = useQueryStates(quadroProducaoSearchParamParsers);
  const [searchDraft, setSearchDraft] = useState(filters.busca);
  const [localColumns, setLocalColumns] = useState<KanbanBoardColumn[] | null>(null);
  const [dragStart, setDragStart] = useState<DragStart | null>(null);
  const [viewCard, setViewCard] = useState<KanbanCardSummary | null>(null);
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [createColumnName, setCreateColumnName] = useState("");
  const [renameTarget, setRenameTarget] = useState<KanbanBoardColumn | null>(null);
  const [renameColumnName, setRenameColumnName] = useState("");
  const [createManualCardOpen, setCreateManualCardOpen] = useState(false);
  const [manualCardDraft, setManualCardDraft] = useState<ManualCardDraft>(() => getEmptyManualCardDraft(""));
  const lastDestinationRef = useRef<DragDestination | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchDraft === filters.busca) return;

    const timeout = window.setTimeout(() => {
      void setFilters({ busca: searchDraft || null });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filters.busca, searchDraft, setFilters]);

  const queryKey = useMemo(() => [BOARD_QUERY_KEY, filters] as const, [filters]);
  const isInitialQuery = areQuadroFiltersEqual(filters, initialFilters);
  const boardQuery = useQuery({
    initialData: isInitialQuery ? initialResult : undefined,
    placeholderData: keepPreviousData,
    queryFn: () => fetchQuadroProducao(filters),
    queryKey,
  });

  const currentResult = boardQuery.data ?? initialResult;

  const canonicalColumns = useMemo(() => getResultColumns(currentResult), [currentResult]);
  const columns = localColumns ?? canonicalColumns;
  const currentTotalVisible = columns.reduce((total, column) => total + column.openCount, 0);
  const filterOptions = currentResult.kind === "ok" ? currentResult.snapshot.filterOptions : null;
  const defaultColumnId = columns[0]?.id ?? "";
  const activeCard = useMemo(
    () => (dragStart ? columns.flatMap((column) => column.cards).find((card) => card.id === dragStart.cardId) ?? null : null),
    [columns, dragStart],
  );

  const refreshBoard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [BOARD_QUERY_KEY] });
  }, [queryClient]);

  const moveCardMutation = useMutation({
    mutationFn: (input: { cardId: string; destinationColumnId: string; destinationIndex: number }) =>
      patchKanbanCardMove(input.cardId, input.destinationColumnId, input.destinationIndex),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: [BOARD_QUERY_KEY] });
      const previous = queryClient.getQueriesData<QuadroProducaoResult>({ queryKey: [BOARD_QUERY_KEY] });
      queryClient.setQueriesData<QuadroProducaoResult>({ queryKey: [BOARD_QUERY_KEY] }, (result) =>
        updateQueryResult(result, (currentColumns) =>
          moveCard(currentColumns, input.cardId, {
            columnId: input.destinationColumnId,
            index: input.destinationIndex,
          }),
        ),
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(error.message);
    },
    onSettled: () => {
      setLocalColumns(null);
      refreshBoard();
    },
  });

  const insumoMutation = useMutation({
    mutationFn: (input: { cardId: string; insumoStatus: InsumoStatus }) =>
      patchKanbanCardInsumoStatus(input.cardId, input.insumoStatus),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: [BOARD_QUERY_KEY] });
      const previous = queryClient.getQueriesData<QuadroProducaoResult>({ queryKey: [BOARD_QUERY_KEY] });
      const updateColumns = (currentColumns: KanbanBoardColumn[]) =>
        currentColumns.map((column) => ({
          ...column,
          cards: column.cards.map((card) =>
            card.id === input.cardId ? { ...card, insumoStatus: input.insumoStatus } : card,
          ),
        }));

      setLocalColumns((currentColumns) => updateColumns(currentColumns ?? canonicalColumns));
      queryClient.setQueriesData<QuadroProducaoResult>({ queryKey: [BOARD_QUERY_KEY] }, (result) =>
        updateQueryResult(result, updateColumns),
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(error.message);
    },
    onSettled: () => {
      setLocalColumns(null);
      refreshBoard();
    },
  });

  const deliverMutation = useMutation({
    mutationFn: (cardId: string) => postKanbanCardEntregar(cardId),
    onMutate: async (cardId) => {
      await queryClient.cancelQueries({ queryKey: [BOARD_QUERY_KEY] });
      const previous = queryClient.getQueriesData<QuadroProducaoResult>({ queryKey: [BOARD_QUERY_KEY] });
      const updateColumns = (currentColumns: KanbanBoardColumn[]) =>
        normalizeColumnCounts(
          currentColumns.map((column) => ({
            ...column,
            cards: column.cards.filter((card) => card.id !== cardId),
          })),
        );

      setLocalColumns((currentColumns) => updateColumns(currentColumns ?? canonicalColumns));
      queryClient.setQueriesData<QuadroProducaoResult>({ queryKey: [BOARD_QUERY_KEY] }, (result) =>
        updateQueryResult(result, updateColumns),
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(error.message);
    },
    onSuccess: () => toast.success("Pedido entregue."),
    onSettled: () => {
      setLocalColumns(null);
      refreshBoard();
    },
  });

  const createColumnMutation = useMutation({
    mutationFn: postKanbanColumn,
    onError: (error: Error) => toast.error(error.message),
    onSuccess: () => {
      toast.success("Coluna criada.");
      setCreateColumnName("");
      setCreateColumnOpen(false);
      refreshBoard();
    },
  });

  const renameColumnMutation = useMutation({
    mutationFn: (input: { id: string; name: string }) => patchKanbanColumn(input.id, input.name),
    onError: (error: Error) => toast.error(error.message),
    onSuccess: () => {
      toast.success("Coluna renomeada.");
      setRenameTarget(null);
      refreshBoard();
    },
  });

  const reorderColumnsMutation = useMutation({
    mutationFn: postKanbanColumnReorder,
    onError: (error: Error) => {
      toast.error(error.message);
      refreshBoard();
    },
    onSuccess: refreshBoard,
  });

  const sortColumnMutation = useMutation({
    mutationFn: postKanbanColumnSortByDate,
    onError: (error: Error) => toast.error(error.message),
    onSuccess: () => {
      toast.success("Coluna ordenada.");
      refreshBoard();
    },
  });

  const createManualCardMutation = useMutation({
    mutationFn: postManualKanbanCard,
    onError: (error: Error) => toast.error(error.message),
    onSuccess: () => {
      toast.success("Cartao criado.");
      setCreateManualCardOpen(false);
      setManualCardDraft(getEmptyManualCardDraft(defaultColumnId));
      refreshBoard();
    },
  });

  const clearFilters = useCallback(() => {
    setSearchDraft("");
    void setFilters({
      arte: null,
      busca: null,
      insumo: null,
      semana: null,
      tecido: null,
    });
  }, [setFilters]);

  const shiftColumn = useCallback((columnId: string, direction: "left" | "right") => {
    setLocalColumns((currentColumns) => {
      const sourceColumns = currentColumns ?? columns;
      const from = sourceColumns.findIndex((column) => column.id === columnId);
      const to = direction === "left" ? from - 1 : from + 1;

      if (from < 0 || to < 0 || to >= sourceColumns.length) {
        return sourceColumns;
      }

      const next = [...sourceColumns];
      const [column] = next.splice(from, 1);
      next.splice(to, 0, column);
      const columnIds = next.map((item) => item.id);
      reorderColumnsMutation.mutate(columnIds);
      return next.map((item, index) => ({ ...item, order_index: index }));
    });
  }, [columns, reorderColumnsMutation]);

  const moveToNextColumn = useCallback((card: KanbanCardSummary) => {
    const columnIndex = columns.findIndex((column) => column.id === card.kanbanColumnId);
    const nextColumn = columns[columnIndex + 1];

    if (!nextColumn) return;

    setLocalColumns((currentColumns) =>
      moveCard(currentColumns ?? columns, card.id, {
        columnId: nextColumn.id,
        index: nextColumn.cards.length,
      }),
    );
    moveCardMutation.mutate({
      cardId: card.id,
      destinationColumnId: nextColumn.id,
      destinationIndex: nextColumn.cards.length,
    });
  }, [columns, moveCardMutation]);

  const openManualCardModal = useCallback((columnId = defaultColumnId) => {
    setManualCardDraft(getEmptyManualCardDraft(columnId));
    setCreateManualCardOpen(true);
  }, [defaultColumnId]);

  const handleCreateColumn = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = createColumnName.trim();
    if (!name) return;
    createColumnMutation.mutate(name);
  }, [createColumnMutation, createColumnName]);

  const handleRenameColumn = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = renameColumnName.trim();
    if (!renameTarget || !name) return;
    renameColumnMutation.mutate({ id: renameTarget.id, name });
  }, [renameColumnMutation, renameColumnName, renameTarget]);

  const handleCreateManualCard = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = manualCardDraft.title.trim();
    if (!title || !manualCardDraft.columnId) return;
    createManualCardMutation.mutate({
      ...manualCardDraft,
      arte: manualCardDraft.arte.trim(),
      material: manualCardDraft.material.trim(),
      title,
    });
  }, [createManualCardMutation, manualCardDraft]);

  if (currentResult.kind === "not-configured") {
    return (
      <section className="quadro-producao-view">
        <div className="quadro-producao-state">
          <h1>Quadro de Producao</h1>
          <p>Supabase nao configurado.</p>
        </div>
      </section>
    );
  }

  if (currentResult.kind === "error") {
    return (
      <section className="quadro-producao-view">
        <div className="quadro-producao-state">
          <h1>Quadro de Producao</h1>
          <p>{currentResult.message}</p>
          <Button onClick={refreshBoard} variant="secondary">
            <RefreshCw aria-hidden="true" size={16} />
            Atualizar
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="quadro-producao-view" data-density="compact" data-version="fiel">
      <header className="quadro-producao-toolbar-card">
        <div className="quadro-producao-toolbar">
          <div className="quadro-producao-toolbar__top">
            <div className="quadro-producao-toolbar__title">
              <h1>Quadro de Produção</h1>
              <span>{formatCount(currentTotalVisible)} em aberto</span>
            </div>

            <div className="quadro-producao-search-input">
              <Search aria-hidden="true" size={15} />
              <input
                aria-label="Pesquisar"
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Cliente, venda, tecido, arte..."
                value={searchDraft}
              />
              {searchDraft ? (
                <button aria-label="Limpar busca" onClick={() => setSearchDraft("")} type="button">
                  <X aria-hidden="true" size={13} />
                </button>
              ) : null}
            </div>

            <div className="quadro-producao-toolbar-actions">
              <Button
                className={filters.semana ? "is-active" : ""}
                onClick={() => void setFilters({ semana: filters.semana ? null : true })}
                variant="secondary"
              >
                <CalendarDays aria-hidden="true" size={14} />
                Semana
              </Button>
              <Tooltip label="Atualizar quadro">
                <button aria-label="Atualizar quadro" className="quadro-producao-icon-button" onClick={refreshBoard} type="button">
                  <RefreshCw aria-hidden="true" className={boardQuery.isFetching ? "quadro-producao-spin" : undefined} size={15} />
                </button>
              </Tooltip>
              <Button onClick={clearFilters} variant="ghost">
                <Filter aria-hidden="true" size={14} />
                Limpar
              </Button>
              <Button onClick={() => setCreateColumnOpen(true)}>
                <Plus aria-hidden="true" size={14} />
                Coluna
              </Button>
            </div>
          </div>

          <div className="quadro-producao-toolbar__bottom">
            <div className="quadro-producao-filters" aria-label="Filtros do quadro">
              <button
                aria-pressed={!filters.arte}
                className="quadro-producao-filter-chip"
                onClick={() => void setFilters({ arte: null })}
                type="button"
              >
                Todos
              </button>
              {(filterOptions?.artes ?? []).map((arte) => (
                <button
                  aria-pressed={filters.arte === arte}
                  className="quadro-producao-filter-chip"
                  key={arte}
                  onClick={() => void setFilters({ arte })}
                  type="button"
                >
                  {normalizePersonalizacaoLabel(arte)}
                </button>
              ))}
            </div>

            <div className="quadro-producao-filter-selects">
              <select
                aria-label="Filtrar por tecido"
                className="quadro-producao-select"
                onChange={(event) => void setFilters({ tecido: event.target.value || null })}
                value={filters.tecido}
              >
                <option value="">Todos os tecidos</option>
                {(filterOptions?.tecidos ?? []).map((tecido) => (
                  <option key={tecido} value={tecido}>
                    {tecido}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar por status"
                className="quadro-producao-select"
                onChange={(event) => void setFilters({ insumo: event.target.value || null })}
                value={filters.insumo}
              >
                <option value="">Todos os status</option>
                {(filterOptions?.insumos ?? []).map((insumo) => (
                  <option key={insumo.value} value={insumo.value}>
                    {insumo.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <DragDropProvider
        onDragStart={(event) => {
          const cardId = event.operation.source?.id != null ? String(event.operation.source.id) : null;
          if (!cardId) return;

          const location = findCardLocation(columns, cardId);
          if (!location) return;

          lastDestinationRef.current = location;
          setDragStart({ cardId, columnId: location.columnId, index: location.index });
        }}
        onDragOver={(event) => {
          if (!dragStart) return;

          const destination = getDestination(event.operation.target, columns);
          if (!destination || sameDestination(lastDestinationRef.current, destination)) return;

          lastDestinationRef.current = destination;
          setLocalColumns((currentColumns) => moveCard(currentColumns ?? columns, dragStart.cardId, destination));
        }}
        onDragEnd={(event) => {
          if (!dragStart) return;

          const destination = event.canceled ? null : lastDestinationRef.current ?? findCardLocation(columns, dragStart.cardId);
          lastDestinationRef.current = null;
          setDragStart(null);

          if (!destination) {
            setLocalColumns(null);
            refreshBoard();
            return;
          }

          if (dragStart.columnId === destination.columnId && dragStart.index === destination.index) {
            setLocalColumns(null);
            return;
          }

          moveCardMutation.mutate({
            cardId: dragStart.cardId,
            destinationColumnId: destination.columnId,
            destinationIndex: destination.index,
          });
        }}
      >
        <div className="quadro-producao-board-scroll">
          <div
            className="quadro-producao-board"
            style={{ "--quadro-column-count": columns.length } as CSSProperties}
          >
            {columns.map((column, index) => (
              <KanbanColumn
                column={column}
                columnIndex={index}
                columns={columns}
                deliverPending={deliverMutation.isPending}
                insumoPending={insumoMutation.isPending}
                isCardDragging={Boolean(dragStart)}
                key={column.id}
                onChangeInsumo={(card, insumoStatus) => insumoMutation.mutate({ cardId: card.id, insumoStatus })}
                onDeliverCard={(card) => deliverMutation.mutate(card.id)}
                onMoveNextCard={moveToNextColumn}
                onOpenManualCard={openManualCardModal}
                onOpenRename={(columnToRename) => {
                  setRenameTarget(columnToRename);
                  setRenameColumnName(columnToRename.name);
                }}
                onOpenView={setViewCard}
                onShiftColumn={shiftColumn}
                onSortByDate={(columnId) => sortColumnMutation.mutate(columnId)}
              />
            ))}
          </div>
        </div>

        <DragPreviewCard card={activeCard} />
      </DragDropProvider>

      {createColumnOpen ? (
        <Modal onClose={() => setCreateColumnOpen(false)} size="sm" title="Nova coluna">
          <form className="quadro-producao-modal-form" onSubmit={handleCreateColumn}>
            <label className="quadro-producao-field">
              <span>Nome</span>
              <input
                autoFocus
                className="quadro-producao-input"
                onChange={(event) => setCreateColumnName(event.target.value)}
                value={createColumnName}
              />
            </label>
            <div className="confirm-dialog__actions">
              <Button onClick={() => setCreateColumnOpen(false)} variant="secondary">
                Cancelar
              </Button>
              <Button disabled={createColumnMutation.isPending} type="submit">
                Salvar
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {renameTarget ? (
        <Modal onClose={() => setRenameTarget(null)} size="sm" title="Renomear coluna">
          <form className="quadro-producao-modal-form" onSubmit={handleRenameColumn}>
            <label className="quadro-producao-field">
              <span>Nome</span>
              <input
                autoFocus
                className="quadro-producao-input"
                onChange={(event) => setRenameColumnName(event.target.value)}
                value={renameColumnName}
              />
            </label>
            <div className="confirm-dialog__actions">
              <Button onClick={() => setRenameTarget(null)} variant="secondary">
                Cancelar
              </Button>
              <Button disabled={renameColumnMutation.isPending} type="submit">
                Salvar
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {createManualCardOpen ? (
        <Modal onClose={() => setCreateManualCardOpen(false)} size="md" title="Novo cartao">
          <form className="quadro-producao-modal-form quadro-producao-modal-form--grid" onSubmit={handleCreateManualCard}>
            <label className="quadro-producao-field quadro-producao-field--full">
              <span>Cliente</span>
              <input
                autoFocus
                className="quadro-producao-input"
                onChange={(event) => setManualCardDraft((draft) => ({ ...draft, title: event.target.value }))}
                value={manualCardDraft.title}
              />
            </label>
            <label className="quadro-producao-field">
              <span>Coluna</span>
              <select
                className="quadro-producao-select"
                onChange={(event) => setManualCardDraft((draft) => ({ ...draft, columnId: event.target.value }))}
                value={manualCardDraft.columnId}
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="quadro-producao-field">
              <span>Entrega</span>
              <input
                className="quadro-producao-input"
                onChange={(event) => setManualCardDraft((draft) => ({ ...draft, dataEntrega: event.target.value }))}
                type="date"
                value={manualCardDraft.dataEntrega}
              />
            </label>
            <label className="quadro-producao-field">
              <span>Arte</span>
              <input
                className="quadro-producao-input"
                onChange={(event) => setManualCardDraft((draft) => ({ ...draft, arte: event.target.value }))}
                value={manualCardDraft.arte}
              />
            </label>
            <label className="quadro-producao-field">
              <span>Tecido</span>
              <input
                className="quadro-producao-input"
                onChange={(event) => setManualCardDraft((draft) => ({ ...draft, material: event.target.value }))}
                value={manualCardDraft.material}
              />
            </label>
            <label className="quadro-producao-field">
              <span>Status</span>
              <select
                className="quadro-producao-select"
                onChange={(event) =>
                  setManualCardDraft((draft) => ({ ...draft, insumoStatus: event.target.value as InsumoStatus }))
                }
                value={manualCardDraft.insumoStatus}
              >
                {INSUMO_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {INSUMO_STATUS_LABELS[value as InsumoStatus]}
                  </option>
                ))}
              </select>
            </label>
            <label className="quadro-producao-checkbox">
              <input
                checked={manualCardDraft.evento}
                onChange={(event) => setManualCardDraft((draft) => ({ ...draft, evento: event.target.checked }))}
                type="checkbox"
              />
              <span>Evento</span>
            </label>
            <div className="confirm-dialog__actions">
              <Button onClick={() => setCreateManualCardOpen(false)} variant="secondary">
                Cancelar
              </Button>
              <Button disabled={createManualCardMutation.isPending} type="submit">
                Salvar
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {viewCard ? (
        <CardDetailsModal
          card={viewCard}
          columns={columns}
          deliverPending={deliverMutation.isPending}
          insumoPending={insumoMutation.isPending}
          onChangeInsumo={(card, insumoStatus) => insumoMutation.mutate({ cardId: card.id, insumoStatus })}
          onClose={() => setViewCard(null)}
          onDeliverCard={(card) => deliverMutation.mutate(card.id)}
          onMoveNextCard={moveToNextColumn}
        />
      ) : null}
    </section>
  );
}

type KanbanColumnProps = {
  column: KanbanBoardColumn;
  columnIndex: number;
  columns: KanbanBoardColumn[];
  deliverPending: boolean;
  insumoPending: boolean;
  isCardDragging: boolean;
  onChangeInsumo: (card: KanbanCardSummary, insumoStatus: InsumoStatus) => void;
  onDeliverCard: (card: KanbanCardSummary) => void;
  onMoveNextCard: (card: KanbanCardSummary) => void;
  onOpenManualCard: (columnId: string) => void;
  onOpenRename: (column: KanbanBoardColumn) => void;
  onOpenView: (card: KanbanCardSummary) => void;
  onShiftColumn: (columnId: string, direction: "left" | "right") => void;
  onSortByDate: (columnId: string) => void;
};

function KanbanColumn({
  column,
  columnIndex,
  columns,
  deliverPending,
  insumoPending,
  isCardDragging,
  onChangeInsumo,
  onDeliverCard,
  onMoveNextCard,
  onOpenManualCard,
  onOpenRename,
  onOpenView,
  onShiftColumn,
  onSortByDate,
}: KanbanColumnProps) {
  const { isDropTarget, ref } = useDroppable({
    accept: "card",
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
          <span className="quadro-producao-column__count">{formatCount(column.openCount)}</span>
        </div>
        <div className="quadro-producao-column__actions">
          <Tooltip label="Mover coluna para a esquerda">
            <button
              aria-label="Mover coluna para a esquerda"
              className="quadro-producao-icon-button"
              disabled={columnIndex === 0}
              onClick={() => onShiftColumn(column.id, "left")}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={14} />
            </button>
          </Tooltip>
          <Tooltip label="Mover coluna para a direita">
            <button
              aria-label="Mover coluna para a direita"
              className="quadro-producao-icon-button"
              disabled={columnIndex === columns.length - 1}
              onClick={() => onShiftColumn(column.id, "right")}
              type="button"
            >
              <ArrowRight aria-hidden="true" size={14} />
            </button>
          </Tooltip>
          <Tooltip label="Ordenar por entrega">
            <button
              aria-label="Ordenar por entrega"
              className="quadro-producao-icon-button"
              onClick={() => onSortByDate(column.id)}
              type="button"
            >
              <CalendarDays aria-hidden="true" size={14} />
            </button>
          </Tooltip>
          <Tooltip label="Novo cartao nesta coluna">
            <button
              aria-label="Novo cartao nesta coluna"
              className="quadro-producao-icon-button"
              onClick={() => onOpenManualCard(column.id)}
              type="button"
            >
              <Plus aria-hidden="true" size={14} />
            </button>
          </Tooltip>
          <Tooltip label="Renomear coluna">
            <button
              aria-label="Renomear coluna"
              className="quadro-producao-icon-button"
              onClick={() => onOpenRename(column)}
              type="button"
            >
              <Pencil aria-hidden="true" size={14} />
            </button>
          </Tooltip>
        </div>
      </header>

      <div className={`quadro-producao-column__list${isDropTarget ? " is-over" : ""}`} ref={ref}>
        {column.cards.length === 0 ? <div className="quadro-producao-empty-column">Nenhum cartao.</div> : null}
        {column.cards.map((card, cardIndex) => (
          <KanbanCard
            card={card}
            cardIndex={cardIndex}
            columnId={column.id}
            deliverPending={deliverPending}
            insumoPending={insumoPending}
            isCardDragging={isCardDragging}
            isLastColumn={columnIndex === columns.length - 1}
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
  deliverPending: boolean;
  insumoPending: boolean;
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
  deliverPending,
  insumoPending,
  isCardDragging,
  isLastColumn,
  onChangeInsumo,
  onDeliverCard,
  onMoveNextCard,
  onOpenView,
}: KanbanCardProps) {
  const { isDragging, isDropping, ref } = useSortable({
    accept: "card",
    group: columnId,
    id: card.id,
    index: cardIndex,
    plugins: CARD_SORTABLE_PLUGINS,
    transition: DND_TIMING,
    type: "card",
  });
  const deliveryUrgency = getDeliveryUrgency(card);

  return (
    <article
      className={`quadro-producao-card${isDragging || isDropping ? " is-dragging" : ""}`}
      data-card-id={card.id}
      ref={ref}
    >
      <div className="quadro-producao-card__body">
        <div className="quadro-producao-card__titlebar">
          <button
            aria-label={`Abrir detalhes de ${card.clienteNome}`}
            className="quadro-producao-card__title"
            onClick={(event) => {
              event.stopPropagation();
              onOpenView(card);
            }}
            onMouseDownCapture={stopCardDrag}
            onMouseDown={stopCardDrag}
            onPointerDownCapture={stopCardDrag}
            onPointerDown={stopCardDrag}
            type="button"
          >
            {card.evento ? (
              <span aria-label="Pedido de evento" className="quadro-producao-card__event-chip" role="img">
                <Star aria-hidden="true" size={12} />
              </span>
            ) : null}
            <span>{card.clienteNome}</span>
          </button>
          {card.clienteAuxiliar ? (
            <Tooltip label={card.clienteAuxiliar}>
              <button
                aria-label={`Alias: ${card.clienteAuxiliar}`}
                className="field-info-button"
                onMouseDownCapture={stopCardDrag}
                onMouseDown={stopCardDrag}
                onPointerDownCapture={stopCardDrag}
                onPointerDown={stopCardDrag}
                type="button"
              >
                <CircleHelp aria-hidden="true" size={14} />
              </button>
            </Tooltip>
          ) : null}
        </div>

        <div className="quadro-producao-card__meta">
          <span className="quadro-producao-card__chip">{normalizePersonalizacaoLabel(card.arte)}</span>
          {!card.isManualCard ? (
            <span className="quadro-producao-card__chip" title="Quantidade total de itens">
              <Package aria-hidden="true" size={12} />
              {formatCount(card.itemQuantity)} {card.itemQuantity === 1 ? "item" : "itens"}
            </span>
          ) : null}
          <label className="quadro-producao-status-chip" data-status={card.insumoStatus}>
            <span className="sr-only">Status</span>
            <select
              aria-label={`Status de ${card.clienteNome}`}
              disabled={insumoPending}
              onChange={(event) => onChangeInsumo(card, event.target.value as InsumoStatus)}
              onClick={stopCardDrag}
              onMouseDownCapture={stopCardDrag}
              onMouseDown={stopCardDrag}
              onPointerDownCapture={stopCardDrag}
              onPointerDown={stopCardDrag}
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

        <div className="quadro-producao-card__footer">
          <div className="quadro-producao-card__delivery" data-urgency={deliveryUrgency}>
            <CalendarDays aria-hidden="true" className="quadro-producao-card__delivery-icon" size={13} />
            <span className="sr-only">{getDeliveryUrgencyLabel(deliveryUrgency)}</span>
            <span>Entrega {formatDate(card.dataEntrega)}</span>
          </div>
          <div className="quadro-producao-card__actions">
            <CardImagePreviewButton card={card} isCardDragging={isCardDragging} onOpenView={onOpenView} />
            {isLastColumn ? (
              <Tooltip label="Marcar como entregue">
                <button
                  aria-label={`Marcar pedido de ${card.clienteNome} como entregue`}
                  className="quadro-producao-icon-button quadro-producao-icon-button--deliver"
                  disabled={deliverPending}
                  onClick={() => onDeliverCard(card)}
                  onMouseDown={stopCardDrag}
                  onPointerDown={stopCardDrag}
                  type="button"
                >
                  <Check aria-hidden="true" size={15} />
                </button>
              </Tooltip>
            ) : (
              <Tooltip label="Mover para a proxima coluna">
                <button
                  aria-label={`Mover ${card.clienteNome} para a proxima coluna`}
                  className="quadro-producao-icon-button quadro-producao-icon-button--success"
                  onClick={() => onMoveNextCard(card)}
                  onMouseDown={stopCardDrag}
                  onPointerDown={stopCardDrag}
                  type="button"
                >
                  <ArrowRight aria-hidden="true" size={15} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});

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
    const previewWidth = preview?.offsetWidth ?? 320;
    const previewHeight = preview?.offsetHeight ?? 180;
    const viewportPadding = 8;
    const pointerOffset = 16;
    const left = Math.min(clientX + pointerOffset, window.innerWidth - previewWidth - viewportPadding);
    const top = Math.min(clientY + pointerOffset, window.innerHeight - previewHeight - viewportPadding);

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

    const rect = trigger.getBoundingClientRect();
    updatePointerPosition(rect.right, rect.bottom);
  }, [open, position, updatePointerPosition]);

  if (!thumbnailUrl) {
    return null;
  }

  return (
    <>
      <button
        aria-label={`Visualizar imagem de ${card.clienteNome}`}
        className="quadro-producao-icon-button"
        onBlur={closePreview}
        onClick={() => {
          if (!isCardDragging) onOpenView(card);
        }}
        onFocus={() => {
          if (!isCardDragging) setOpen(true);
        }}
        onMouseDown={stopCardDrag}
        onPointerDown={stopCardDrag}
        onPointerEnter={(event) => {
          if (isCardDragging) return;
          setOpen(true);
          updatePointerPosition(event.clientX, event.clientY);
        }}
        onPointerLeave={closePreview}
        onPointerMove={(event) => {
          if (!isCardDragging) updatePointerPosition(event.clientX, event.clientY);
        }}
        ref={triggerRef}
        type="button"
      >
        <Eye aria-hidden="true" size={15} />
      </button>
      {typeof document !== "undefined" && open
        ? createPortal(
          <div className="quadro-producao-image-preview" ref={previewRef} role="tooltip" style={position ?? undefined}>
            <Image alt="" height={180} src={thumbnailUrl} width={320} />
          </div>,
          document.body,
        )
        : null}
    </>
  );
}

function DragPreviewCard({ card }: { card: KanbanCardSummary | null }) {
  if (!card) {
    return null;
  }

  return (
    <div className="quadro-producao-drag-preview" aria-hidden="true">
      <span>{card.clienteNome}</span>
      <small>{normalizePersonalizacaoLabel(card.arte)}</small>
    </div>
  );
}

type CardDetailsModalProps = {
  card: KanbanCardSummary;
  columns: KanbanBoardColumn[];
  deliverPending: boolean;
  insumoPending: boolean;
  onChangeInsumo: (card: KanbanCardSummary, insumoStatus: InsumoStatus) => void;
  onClose: () => void;
  onDeliverCard: (card: KanbanCardSummary) => void;
  onMoveNextCard: (card: KanbanCardSummary) => void;
};

function CardDetailsModal({
  card,
  columns,
  deliverPending,
  insumoPending,
  onChangeInsumo,
  onClose,
  onDeliverCard,
  onMoveNextCard,
}: CardDetailsModalProps) {
  const currentColumnIndex = columns.findIndex((column) => column.id === card.kanbanColumnId);
  const isLastColumn = currentColumnIndex === columns.length - 1;
  const imageUrl = getCloudinaryThumbnailUrl(card.thumbUrl, 720, 405);

  return (
    <Modal onClose={onClose} size="lg" title={`Detalhes de ${card.clienteNome}`}>
      <div className="quadro-producao-view-modal">
        <div className="quadro-producao-view-modal__media">
          {imageUrl ? (
            <Image
              alt=""
              className="quadro-producao-view-modal__image"
              height={405}
              src={imageUrl}
              width={720}
            />
          ) : (
            <div className="quadro-producao-view-modal__image-placeholder">Sem imagem</div>
          )}
        </div>
        <div className="quadro-producao-view-modal__content">
          <header className="quadro-producao-view-modal__header">
            <h2>{card.clienteNome}</h2>
            <div className="quadro-producao-view-modal__tags">
              {card.evento ? <span className="quadro-producao-card__chip">Evento</span> : null}
              <span className="quadro-producao-card__chip">{normalizePersonalizacaoLabel(card.arte)}</span>
            </div>
          </header>

          <dl className="quadro-producao-view-grid">
            <div>
              <dt>Entrega</dt>
              <dd>{formatDateLong(card.dataEntrega)}</dd>
            </div>
            <div>
              <dt>Tecido</dt>
              <dd>{card.material || "-"}</dd>
            </div>
            <div>
              <dt>Venda</dt>
              <dd>{card.numeroVenda || "-"}</dd>
            </div>
            <div>
              <dt>Vendedor</dt>
              <dd>{card.vendedor || "-"}</dd>
            </div>
          </dl>

          <div className="quadro-producao-view-modal__actions">
            <label className="quadro-producao-view-modal__status">
              <span>Status</span>
              <select
                className="quadro-producao-select"
                disabled={insumoPending}
                onChange={(event) => onChangeInsumo(card, event.target.value as InsumoStatus)}
                value={card.insumoStatus}
              >
                {INSUMO_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {INSUMO_STATUS_LABELS[value as InsumoStatus]}
                  </option>
                ))}
              </select>
            </label>
            {isLastColumn ? (
              <Button
                className="quadro-producao-view-modal__move quadro-producao-view-modal__move--deliver"
                disabled={deliverPending}
                onClick={() => onDeliverCard(card)}
                variant="secondary"
              >
                <Check aria-hidden="true" size={16} />
                Entregar
              </Button>
            ) : (
              <Button className="quadro-producao-view-modal__move" onClick={() => onMoveNextCard(card)} variant="secondary">
                <ArrowRight aria-hidden="true" size={16} />
                Proxima coluna
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
