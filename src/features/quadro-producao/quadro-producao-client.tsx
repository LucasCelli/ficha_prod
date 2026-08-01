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
import { useSortable } from "@dnd-kit/react/sortable";
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
import { Button, IconButton, Modal, Tooltip } from "@/components/ui";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import type {
  KanbanBoardColumn,
  KanbanCardSummary,
  QuadroProducaoFilters,
  QuadroProducaoResult,
} from "./data";
import {
  fetchQuadroProducao,
  patchKanbanCardMove,
  patchKanbanColumn,
  postKanbanCardEntregar,
  postKanbanColumn,
  postKanbanColumnReorder,
  postKanbanColumnSortByDate,
  postManualKanbanCard,
} from "./api";
import { quadroProducaoSearchParamParsers } from "./search-params";
import { CardDetailsModal } from "./card-details-modal";

type QuadroProducaoClientProps = {
  initialFilters: QuadroProducaoFilters;
  initialResult: QuadroProducaoResult;
};

import {
  BOARD_QUERY_KEY, CARD_SORTABLE_PLUGINS, DND_TIMING, areQuadroFiltersEqual, findCardLocation,
  formatCount, formatDate, getCloudinaryThumbnailUrl, getColumnAccentStyle,
  getDeliveryUrgency, getDeliveryUrgencyLabel, getDestination, getEmptyManualCardDraft,
  getResultColumns, moveCard, normalizeColumnCounts, sameDestination, stopCardDrag, updateQueryResult,
  type DragDestination, type DragStart, type ManualCardDraft,
} from "./quadro-producao-state";
export function QuadroProducaoClient({ initialFilters, initialResult }: QuadroProducaoClientProps) {
  const [filters, setFilters] = useQueryStates(quadroProducaoSearchParamParsers);
  const [searchDraft, setSearchDraft] = useState(filters.busca);
  const [localColumns, setLocalColumns] = useState<KanbanBoardColumn[] | null>(null);
  const [dragStart, setDragStart] = useState<DragStart | null>(null);
  const [dropColumnId, setDropColumnId] = useState<string | null>(null);
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
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const currentResult = boardQuery.data ?? initialResult;

  const canonicalColumns = useMemo(() => getResultColumns(currentResult), [currentResult]);
  const columns = localColumns ?? canonicalColumns;
  const columnsRef = useRef(columns);
  useLayoutEffect(() => {
    columnsRef.current = columns;
  }, [columns]);
  const currentTotalVisible = columns.reduce((total, column) => total + column.openCount, 0);
  const filterOptions = currentResult.kind === "ok" ? currentResult.snapshot.filterOptions : null;
  const defaultColumnId = columns[0]?.id ?? "";
  const refreshBoard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [BOARD_QUERY_KEY] });
  }, [queryClient]);

  const moveCardMutation = useMutation({
    mutationFn: (input: {
      cardId: string;
      destinationColumnId: string;
      destinationIndex: number;
      optimisticColumns: KanbanBoardColumn[];
    }) => patchKanbanCardMove(input.cardId, input.destinationColumnId, input.destinationIndex),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<QuadroProducaoResult>(queryKey);
      queryClient.setQueryData<QuadroProducaoResult>(queryKey, (result) =>
        updateQueryResult(result, () => input.optimisticColumns),
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      setLocalColumns(null);
      toast.error(error.message);
    },
    onSuccess: () => {
      setLocalColumns(null);
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

  const mutateMoveCard = moveCardMutation.mutate;
  const mutateDeliverCard = deliverMutation.mutate;
  const mutateReorderColumns = reorderColumnsMutation.mutate;
  const mutateSortColumn = sortColumnMutation.mutate;

  const clearFilters = useCallback(() => {
    setSearchDraft("");
    void setFilters({
      arte: null,
      busca: null,
      semana: null,
      tecido: null,
    });
  }, [setFilters]);

  const shiftColumn = useCallback((columnId: string, direction: "left" | "right") => {
    setLocalColumns((currentColumns) => {
      const sourceColumns = currentColumns ?? columnsRef.current;
      const from = sourceColumns.findIndex((column) => column.id === columnId);
      const to = direction === "left" ? from - 1 : from + 1;

      if (from < 0 || to < 0 || to >= sourceColumns.length) {
        return sourceColumns;
      }

      const next = [...sourceColumns];
      const [column] = next.splice(from, 1);
      next.splice(to, 0, column);
      mutateReorderColumns(next.map((item) => item.id));
      return next.map((item, index) => ({ ...item, order_index: index }));
    });
  }, [mutateReorderColumns]);

  const moveToNextColumn = useCallback((card: KanbanCardSummary) => {
    const boardColumns = columnsRef.current;
    const columnIndex = boardColumns.findIndex((column) => column.id === card.kanbanColumnId);
    const nextColumn = boardColumns[columnIndex + 1];

    if (!nextColumn) return;

    const optimisticColumns = moveCard(boardColumns, card.id, {
      columnId: nextColumn.id,
      index: nextColumn.cards.length,
    });
    setLocalColumns(optimisticColumns);
    mutateMoveCard({
      cardId: card.id,
      destinationColumnId: nextColumn.id,
      destinationIndex: nextColumn.cards.length,
      optimisticColumns,
    });
  }, [mutateMoveCard]);

  const openManualCardModal = useCallback((columnId = defaultColumnId) => {
    setManualCardDraft(getEmptyManualCardDraft(columnId));
    setCreateManualCardOpen(true);
  }, [defaultColumnId]);

  const deliverCard = useCallback((card: KanbanCardSummary) => {
    mutateDeliverCard(card.id);
  }, [mutateDeliverCard]);

  const openRenameColumn = useCallback((column: KanbanBoardColumn) => {
    setRenameTarget(column);
    setRenameColumnName(column.name);
  }, []);

  const sortColumnByDate = useCallback((columnId: string) => {
    mutateSortColumn(columnId);
  }, [mutateSortColumn]);

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
    <section
      className={`quadro-producao-view${dragStart ? " is-dragging-card" : ""}`}
      data-density="compact"
      data-version="fiel"
    >
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
          setDropColumnId(null);
          setDragStart({ cardId, columnId: location.columnId, index: location.index });
        }}
        onDragOver={(event) => {
          if (!dragStart) return;

          const destination = getDestination(event.operation.target, columns);
          if (!destination || sameDestination(lastDestinationRef.current, destination)) return;

          lastDestinationRef.current = destination;
          setDropColumnId((currentColumnId) =>
            currentColumnId === destination.columnId ? currentColumnId : destination.columnId,
          );
          setLocalColumns((currentColumns) =>
            moveCard(currentColumns ?? columns, dragStart.cardId, destination),
          );
        }}
        onDragEnd={(event) => {
          if (!dragStart) return;

          const destination = event.canceled ? null : lastDestinationRef.current ?? findCardLocation(columns, dragStart.cardId);
          lastDestinationRef.current = null;
          setDropColumnId(null);
          setDragStart(null);

          if (!destination) {
            setLocalColumns(null);
            return;
          }

          if (dragStart.columnId === destination.columnId && dragStart.index === destination.index) {
            setLocalColumns(null);
            return;
          }

          mutateMoveCard({
            cardId: dragStart.cardId,
            destinationColumnId: destination.columnId,
            destinationIndex: destination.index,
            optimisticColumns: moveCard(columns, dragStart.cardId, destination),
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
                canShiftLeft={index > 0}
                canShiftRight={index < columns.length - 1}
                column={column}
                deliverPending={deliverMutation.isPending}
                isDropColumn={dropColumnId === column.id}
                isLastColumn={index === columns.length - 1}
                key={column.id}
                onDeliverCard={deliverCard}
                onMoveNextCard={moveToNextColumn}
                onOpenManualCard={openManualCardModal}
                onOpenRename={openRenameColumn}
                onOpenView={setViewCard}
                onShiftColumn={shiftColumn}
                onSortByDate={sortColumnByDate}
              />
            ))}
          </div>
        </div>
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
          onClose={() => setViewCard(null)}
          onDeliverCard={(card) => deliverMutation.mutate(card.id)}
          onMoveNextCard={moveToNextColumn}
        />
      ) : null}
    </section>
  );
}

type KanbanColumnProps = {
  canShiftLeft: boolean;
  canShiftRight: boolean;
  column: KanbanBoardColumn;
  deliverPending: boolean;
  isDropColumn: boolean;
  isLastColumn: boolean;
  onDeliverCard: (card: KanbanCardSummary) => void;
  onMoveNextCard: (card: KanbanCardSummary) => void;
  onOpenManualCard: (columnId: string) => void;
  onOpenRename: (column: KanbanBoardColumn) => void;
  onOpenView: (card: KanbanCardSummary) => void;
  onShiftColumn: (columnId: string, direction: "left" | "right") => void;
  onSortByDate: (columnId: string) => void;
};

const KanbanColumn = memo(function KanbanColumn({
  canShiftLeft,
  canShiftRight,
  column,
  deliverPending,
  isDropColumn,
  isLastColumn,
  onDeliverCard,
  onMoveNextCard,
  onOpenManualCard,
  onOpenRename,
  onOpenView,
  onShiftColumn,
  onSortByDate,
}: KanbanColumnProps) {
  const { ref } = useDroppable({
    accept: "card",
    id: column.id,
    type: "column",
  });

  return (
    <section
      className={`quadro-producao-column${isDropColumn ? " is-drop-target" : ""}`}
      style={getColumnAccentStyle(column.order_index)}
    >
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
              disabled={!canShiftLeft}
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
              disabled={!canShiftRight}
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

      <div className="quadro-producao-column__list">
        {column.cards.map((card, cardIndex) => (
          <KanbanCard
            card={card}
            cardIndex={cardIndex}
            columnId={column.id}
            deliverPending={deliverPending}
            isLastColumn={isLastColumn}
            key={card.id}
            onDeliverCard={onDeliverCard}
            onMoveNextCard={onMoveNextCard}
            onOpenView={onOpenView}
          />
        ))}
        <div
          aria-label={column.cards.length === 0 ? `Soltar cartao em ${column.displayName}` : undefined}
          className="quadro-producao-column__drop-zone"
          ref={ref}
        >
          {column.cards.length === 0 ? <span>Nenhum cartao.</span> : null}
        </div>
      </div>
    </section>
  );
});

type KanbanCardProps = {
  card: KanbanCardSummary;
  cardIndex: number;
  columnId: string;
  deliverPending: boolean;
  isLastColumn: boolean;
  onDeliverCard: (card: KanbanCardSummary) => void;
  onMoveNextCard: (card: KanbanCardSummary) => void;
  onOpenView: (card: KanbanCardSummary) => void;
};

const KanbanCard = memo(function KanbanCard({
  card,
  cardIndex,
  columnId,
  deliverPending,
  isLastColumn,
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
          <div className="quadro-producao-card__title">
            {card.evento ? (
              <span aria-label="Pedido de evento" className="quadro-producao-card__event-chip" role="img">
                <Star aria-hidden="true" size={12} />
              </span>
            ) : null}
            <span>{card.clienteNome}</span>
          </div>
          {card.clienteAuxiliar ? (
            <IconButton
              appearance="bare"
              className="field-info-button"
              label={card.clienteAuxiliar}
              onMouseDownCapture={stopCardDrag}
              onMouseDown={stopCardDrag}
              onPointerDownCapture={stopCardDrag}
              onPointerDown={stopCardDrag}
            >
              <CircleHelp aria-hidden="true" size={14} />
            </IconButton>
          ) : null}
        </div>

        <div className="quadro-producao-card__meta">
          <span className="quadro-producao-card__chip">{normalizePersonalizacaoLabel(card.arte)}</span>
          {!card.isManualCard ? (
            <Tooltip label="Quantidade total de itens">
              <span className="quadro-producao-card__chip">
                <Package aria-hidden="true" size={12} />
                {formatCount(card.itemQuantity)} {card.itemQuantity === 1 ? "item" : "itens"}
              </span>
            </Tooltip>
          ) : null}
        </div>

        <div className="quadro-producao-card__footer">
          <div className="quadro-producao-card__delivery" data-urgency={deliveryUrgency}>
            <CalendarDays aria-hidden="true" className="quadro-producao-card__delivery-icon" size={13} />
            <span className="sr-only">{getDeliveryUrgencyLabel(deliveryUrgency)}</span>
            <span>Entrega {formatDate(card.dataEntrega)}</span>
          </div>
          <div className="quadro-producao-card__actions">
            <CardImagePreviewButton card={card} onOpenView={onOpenView} />
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
              <Tooltip label="Mover para a próxima coluna">
                <button
                  aria-label={`Mover ${card.clienteNome} para a próxima coluna`}
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
  onOpenView: (card: KanbanCardSummary) => void;
};

function CardImagePreviewButton({ card, onOpenView }: CardImagePreviewButtonProps) {
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
        onClick={() => onOpenView(card)}
        onFocus={() => setOpen(true)}
        onMouseDown={stopCardDrag}
        onPointerDown={stopCardDrag}
        onPointerEnter={(event) => {
          setOpen(true);
          updatePointerPosition(event.clientX, event.clientY);
        }}
        onPointerLeave={closePreview}
        onPointerMove={(event) => updatePointerPosition(event.clientX, event.clientY)}
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
