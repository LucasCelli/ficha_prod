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
import { CollisionPriority } from "@dnd-kit/abstract";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
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
  Trash2,
  X,
} from "lucide-react";
import { Button, CustomDatalist, IconButton, Modal, Tooltip, type CustomDatalistOption } from "@/components/ui";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import type {
  KanbanBoardColumn,
  KanbanCardSummary,
  QuadroProducaoFilters,
  QuadroProducaoResult,
} from "./data";
import {
  fetchQuadroProducao,
  deleteManualKanbanCard,
  patchKanbanCardMove,
  patchKanbanColumn,
  postKanbanCardEntregar,
  postKanbanColumn,
  postKanbanColumnReorder,
  postKanbanColumnSortByDate,
  postKanbanSortAllByDate,
  postManualKanbanCard,
} from "./api";
import { quadroProducaoSearchParamParsers } from "./search-params";
import { CardDetailsModal } from "./card-details-modal";

type QuadroProducaoClientProps = {
  catalogFabricOptions: CustomDatalistOption[];
  initialFilters: QuadroProducaoFilters;
  initialResult: QuadroProducaoResult;
};

type BoardQueryKey = readonly [typeof BOARD_QUERY_KEY, QuadroProducaoFilters];
type OrderOperationBase = {
  cacheKey: BoardQueryKey;
  optimisticColumns: KanbanBoardColumn[];
  revision: number;
};
type OrderOperation =
  | (OrderOperationBase & { kind: "move"; cardId: string; placement: CardPlacement })
  | (OrderOperationBase & { kind: "sort-column"; columnId: string })
  | (OrderOperationBase & { kind: "sort-all" });

import {
  BOARD_QUERY_KEY, DND_TIMING, areQuadroFiltersEqual, findCardLocation,
  formatCount, formatDate, getCardDndId, getCardIdFromDndId, getCardPlacement,
  getCloudinaryThumbnailUrl, getColumnAccentStyle, getColumnDndId, getColumnIdFromDndId,
  getDeliveryUrgency, getDeliveryUrgencyLabel, getDestination, getEmptyManualCardDraft,
  getResultColumns, moveCard, removeCard, sameDestination, sortAllColumnsByDeliveryDate,
  sortColumnByDeliveryDate, stopCardDrag, updateQueryResult,
  type CardPlacement, type DragStart, type ManualCardDraft,
} from "./quadro-producao-state";
export function QuadroProducaoClient({ catalogFabricOptions, initialFilters, initialResult }: QuadroProducaoClientProps) {
  const [filters, setFilters] = useQueryStates(quadroProducaoSearchParamParsers);
  const [searchDraft, setSearchDraft] = useState(filters.busca);
  const [dragStart, setDragStart] = useState<DragStart | null>(null);
  const [dropColumnId, setDropColumnId] = useState<string | null>(null);
  const [viewCard, setViewCard] = useState<KanbanCardSummary | null>(null);
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [createColumnName, setCreateColumnName] = useState("");
  const [renameTarget, setRenameTarget] = useState<KanbanBoardColumn | null>(null);
  const [renameColumnName, setRenameColumnName] = useState("");
  const [createManualCardOpen, setCreateManualCardOpen] = useState(false);
  const [manualCardDraft, setManualCardDraft] = useState<ManualCardDraft>(() => getEmptyManualCardDraft(""));
  const dragStartRef = useRef<DragStart | null>(null);
  const latestOrderRevisionRef = useRef(0);
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
    refetchOnMount: true,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const currentResult = boardQuery.data ?? initialResult;

  const canonicalColumns = useMemo(() => getResultColumns(currentResult), [currentResult]);
  const columns = canonicalColumns;
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

  const orderMutation = useMutation({
    mutationFn: (input: OrderOperation) => {
      if (input.kind === "move") {
        return patchKanbanCardMove(
          input.cardId,
          input.placement.columnId,
          input.placement.index,
          input.placement.previousCardId,
          input.placement.nextCardId,
        );
      }
      if (input.kind === "sort-column") return postKanbanColumnSortByDate(input.columnId);
      return postKanbanSortAllByDate();
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: input.cacheKey });
      queryClient.setQueryData<QuadroProducaoResult>(input.cacheKey, (result) =>
        updateQueryResult(result, () => input.optimisticColumns),
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSuccess: (_data, input) => {
      if (input.kind === "sort-column") toast.success("Coluna ordenada por data.");
      if (input.kind === "sort-all") toast.success("Quadro ordenado por data.");
    },
    onSettled: (_data, _error, input) => {
      if (input.revision !== latestOrderRevisionRef.current) return;
      void queryClient.invalidateQueries({ queryKey: [BOARD_QUERY_KEY] });
    },
    scope: { id: "kanban-card-order" },
  });


  const deliverMutation = useMutation({
    mutationFn: (cardId: string) => postKanbanCardEntregar(cardId),
    onMutate: async (cardId) => {
      await queryClient.cancelQueries({ queryKey: [BOARD_QUERY_KEY] });
      const previous = queryClient.getQueriesData<QuadroProducaoResult>({ queryKey: [BOARD_QUERY_KEY] });
      const updateColumns = (currentColumns: KanbanBoardColumn[]) => removeCard(currentColumns, cardId);

      columnsRef.current = updateColumns(columnsRef.current);
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
    onSettled: refreshBoard,
    scope: { id: "kanban-card-order" },
  });

  const deleteMutation = useMutation({
    mutationFn: (cardId: string) => deleteManualKanbanCard(cardId),
    onError: (error: Error) => toast.error(error.message),
    onSuccess: () => {
      toast.success("Cartão excluído.");
      setViewCard(null);
      refreshBoard();
    },
    scope: { id: "kanban-card-order" },
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
    scope: { id: "kanban-column-order" },
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
    scope: { id: "kanban-card-order" },
  });

  const mutateOrder = orderMutation.mutate;
  const mutateDeliverCard = deliverMutation.mutate;
  const mutateReorderColumns = reorderColumnsMutation.mutate;
  const isSorting = orderMutation.isPending
    && (orderMutation.variables?.kind === "sort-column" || orderMutation.variables?.kind === "sort-all");
  const isOrderInteractionLocked = isSorting || boardQuery.isPlaceholderData;

  const clearFilters = useCallback(() => {
    setSearchDraft("");
    void setFilters({
      arte: null,
      busca: null,
      semana: null,
      tecido: null,
    });
  }, [setFilters]);

  const persistCardMove = useCallback((cardId: string, optimisticColumns: KanbanBoardColumn[]) => {
    const placement = getCardPlacement(optimisticColumns, cardId);
    if (!placement) return;
    const revision = ++latestOrderRevisionRef.current;

    columnsRef.current = optimisticColumns;
    queryClient.setQueryData<QuadroProducaoResult>(queryKey, (result) =>
      updateQueryResult(result, () => optimisticColumns),
    );
    mutateOrder({ cacheKey: queryKey, cardId, kind: "move", optimisticColumns, placement, revision });
  }, [mutateOrder, queryClient, queryKey]);

  const shiftColumn = useCallback((columnId: string, direction: "left" | "right") => {
    const sourceColumns = columnsRef.current;
    const from = sourceColumns.findIndex((column) => column.id === columnId);
    const to = direction === "left" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= sourceColumns.length) return;

    const next = [...sourceColumns];
    const [column] = next.splice(from, 1);
    next.splice(to, 0, column);
    const optimisticColumns = next.map((item, index) => ({ ...item, order_index: index }));
    columnsRef.current = optimisticColumns;
    queryClient.setQueryData<QuadroProducaoResult>(queryKey, (result) =>
      updateQueryResult(result, () => optimisticColumns),
    );
    mutateReorderColumns(optimisticColumns.map((item) => item.id));
  }, [mutateReorderColumns, queryClient, queryKey]);

  const moveToNextColumn = useCallback((card: KanbanCardSummary) => {
    const boardColumns = columnsRef.current;
    const currentLocation = findCardLocation(boardColumns, card.id);
    if (!currentLocation) return;
    const columnIndex = boardColumns.findIndex((column) => column.id === currentLocation.columnId);
    const nextColumn = boardColumns[columnIndex + 1];

    if (!nextColumn) return;

    const optimisticColumns = moveCard(boardColumns, card.id, {
      columnId: nextColumn.id,
      index: nextColumn.cards.length,
    });
    persistCardMove(card.id, optimisticColumns);
  }, [persistCardMove]);

  const openManualCardModal = useCallback((columnId = defaultColumnId) => {
    setManualCardDraft(getEmptyManualCardDraft(columnId));
    setCreateManualCardOpen(true);
  }, [defaultColumnId]);

  const deliverCard = useCallback((card: KanbanCardSummary) => {
    mutateDeliverCard(card.id);
  }, [mutateDeliverCard]);

  const deleteCard = useCallback((card: KanbanCardSummary) => {
    if (window.confirm(`Excluir o cartão manual “${card.clienteNome}”?`)) deleteMutation.mutate(card.id);
  }, [deleteMutation]);

  const openRenameColumn = useCallback((column: KanbanBoardColumn) => {
    setRenameTarget(column);
    setRenameColumnName(column.name);
  }, []);

  const sortColumnByDate = useCallback((columnId: string) => {
    const optimisticColumns = sortColumnByDeliveryDate(columnsRef.current, columnId);
    const revision = ++latestOrderRevisionRef.current;
    columnsRef.current = optimisticColumns;
    queryClient.setQueryData<QuadroProducaoResult>(queryKey, (result) =>
      updateQueryResult(result, () => optimisticColumns),
    );
    mutateOrder({ cacheKey: queryKey, columnId, kind: "sort-column", optimisticColumns, revision });
  }, [mutateOrder, queryClient, queryKey]);

  const sortAllByDate = useCallback(() => {
    const optimisticColumns = sortAllColumnsByDeliveryDate(columnsRef.current);
    const revision = ++latestOrderRevisionRef.current;
    columnsRef.current = optimisticColumns;
    queryClient.setQueryData<QuadroProducaoResult>(queryKey, (result) =>
      updateQueryResult(result, () => optimisticColumns),
    );
    mutateOrder({ cacheKey: queryKey, kind: "sort-all", optimisticColumns, revision });
  }, [mutateOrder, queryClient, queryKey]);

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
          <h1>Quadro de Produção</h1>
          <p>Supabase não configurado.</p>
        </div>
      </section>
    );
  }

  if (currentResult.kind === "error") {
    return (
      <section className="quadro-producao-view">
        <div className="quadro-producao-state">
          <h1>Quadro de Produção</h1>
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
                <IconButton appearance="bare" label="Limpar busca" onClick={() => setSearchDraft("")} tooltip={false}>
                  <X aria-hidden="true" size={13} />
                </IconButton>
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
              <Button
                aria-busy={isSorting}
                disabled={isOrderInteractionLocked}
                onClick={sortAllByDate}
                variant="secondary"
              >
                <CalendarDays aria-hidden="true" className={isSorting ? "quadro-producao-spin" : undefined} size={14} />
                {isSorting ? "Ordenando..." : "Ordenar por data"}
              </Button>
              <IconButton
                appearance="bare"
                label="Atualizar quadro"
                className="quadro-producao-icon-button"
                onClick={refreshBoard}
              >
                <RefreshCw aria-hidden="true" className={boardQuery.isFetching ? "quadro-producao-spin" : undefined} size={15} />
              </IconButton>
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
          if (isOrderInteractionLocked) return;
          const cardId = event.operation.source?.id != null
            ? getCardIdFromDndId(String(event.operation.source.id))
            : null;
          if (!cardId) return;

          const sourceColumns = columnsRef.current;
          const location = findCardLocation(sourceColumns, cardId);
          if (!location) return;

          const start = { cardId, columnId: location.columnId, index: location.index };
          dragStartRef.current = start;
          setDropColumnId(null);
          setDragStart(start);
        }}
        onDragOver={(event) => {
          const activeDrag = dragStartRef.current;
          if (!activeDrag) return;

          const destination = getDestination(event.operation.target, columnsRef.current);
          if (!destination) {
            setDropColumnId(null);
            return;
          }

          setDropColumnId((currentColumnId) =>
            currentColumnId === destination.columnId ? currentColumnId : destination.columnId,
          );
        }}
        onDragEnd={(event) => {
          const activeDrag = dragStartRef.current;
          if (!activeDrag) return;

          dragStartRef.current = null;
          setDropColumnId(null);
          setDragStart(null);

          const { source, target } = event.operation;
          if (event.canceled || !target || !isSortable(source) || source.group == null) return;

          const destinationColumnId = getColumnIdFromDndId(String(source.group));
          if (!destinationColumnId) return;
          const destination = { columnId: destinationColumnId, index: Math.max(0, source.index) };
          if (sameDestination(activeDrag, destination)) return;

          const optimisticColumns = moveCard(columnsRef.current, activeDrag.cardId, destination);
          persistCardMove(activeDrag.cardId, optimisticColumns);
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
                dragDisabled={isOrderInteractionLocked}
                isDropColumn={dropColumnId === column.id}
                isLastColumn={index === columns.length - 1}
                key={column.id}
                onDeliverCard={deliverCard}
                onDeleteCard={deleteCard}
                onMoveNextCard={moveToNextColumn}
                onOpenManualCard={openManualCardModal}
                onOpenRename={openRenameColumn}
                onOpenView={setViewCard}
                onShiftColumn={shiftColumn}
                onSortByDate={sortColumnByDate}
                sortPending={isOrderInteractionLocked}
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
              <select
                className="quadro-producao-input"
                onChange={(event) => setManualCardDraft((draft) => ({ ...draft, arte: event.target.value }))}
                value={manualCardDraft.arte}
              >
                <option value="">-</option><option value="sem_personalizacao">Sem Personalização</option>
                <option value="sublimacao">Sublimação</option><option value="serigrafia">Serigrafia</option>
                <option value="bordado">Bordado</option><option value="patch">PATCH Termocolante</option>
                <option value="dtf">DTF Têxtil</option><option value="transfer">Transfer</option>
                <option value="sublimacao_serigrafia">Sublimação e Serigrafia</option>
                <option value="serigrafia_dtf">Serigrafia e DTF</option><option value="serigrafia_bordado">Serigrafia e Bordado</option>
              </select>
            </label>
            <label className="quadro-producao-field">
              <span>Tecido</span>
              <CustomDatalist
                id="manual-card-material"
                onValueChange={(value) => setManualCardDraft((draft) => ({ ...draft, material: value }))}
                options={catalogFabricOptions}
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
          onDeleteCard={deleteCard}
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
  dragDisabled: boolean;
  isDropColumn: boolean;
  isLastColumn: boolean;
  onDeliverCard: (card: KanbanCardSummary) => void;
  onDeleteCard: (card: KanbanCardSummary) => void;
  onMoveNextCard: (card: KanbanCardSummary) => void;
  onOpenManualCard: (columnId: string) => void;
  onOpenRename: (column: KanbanBoardColumn) => void;
  onOpenView: (card: KanbanCardSummary) => void;
  onShiftColumn: (columnId: string, direction: "left" | "right") => void;
  onSortByDate: (columnId: string) => void;
  sortPending: boolean;
};

const KanbanColumn = memo(function KanbanColumn({
  canShiftLeft,
  canShiftRight,
  column,
  deliverPending,
  dragDisabled,
  isDropColumn,
  isLastColumn,
  onDeliverCard,
  onDeleteCard,
  onMoveNextCard,
  onOpenManualCard,
  onOpenRename,
  onOpenView,
  onShiftColumn,
  onSortByDate,
  sortPending,
}: KanbanColumnProps) {
  const { ref } = useDroppable({
    accept: "card",
    collisionPriority: CollisionPriority.Low,
    id: getColumnDndId(column.id),
    type: "column",
  });

  return (
    <section
      className={`quadro-producao-column${isDropColumn ? " is-drop-target" : ""}`}
      data-column-id={column.id}
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
          <IconButton
            appearance="bare"
            label="Mover coluna para a esquerda"
            className="quadro-producao-icon-button"
            disabled={!canShiftLeft}
            onClick={() => onShiftColumn(column.id, "left")}
          >
            <ArrowLeft aria-hidden="true" size={14} />
          </IconButton>
          <IconButton
            appearance="bare"
            label="Mover coluna para a direita"
            className="quadro-producao-icon-button"
            disabled={!canShiftRight}
            onClick={() => onShiftColumn(column.id, "right")}
          >
            <ArrowRight aria-hidden="true" size={14} />
          </IconButton>
          <IconButton
            appearance="bare"
            label="Ordenar por entrega"
            className="quadro-producao-icon-button"
            disabled={sortPending}
            onClick={() => onSortByDate(column.id)}
          >
            <CalendarDays aria-hidden="true" size={14} />
          </IconButton>
          <IconButton
            appearance="bare"
            label="Novo cartao nesta coluna"
            className="quadro-producao-icon-button"
            onClick={() => onOpenManualCard(column.id)}
          >
            <Plus aria-hidden="true" size={14} />
          </IconButton>
          <IconButton
            appearance="bare"
            label="Renomear coluna"
            className="quadro-producao-icon-button"
            onClick={() => onOpenRename(column)}
          >
            <Pencil aria-hidden="true" size={14} />
          </IconButton>
        </div>
      </header>

      <div className="quadro-producao-column__list">
        {column.cards.map((card, cardIndex) => (
          <KanbanCard
            card={card}
            cardIndex={cardIndex}
            columnId={column.id}
            deliverPending={deliverPending}
            dragDisabled={dragDisabled}
            isLastColumn={isLastColumn}
            key={card.id}
            onDeliverCard={onDeliverCard}
            onDeleteCard={onDeleteCard}
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
  dragDisabled: boolean;
  isLastColumn: boolean;
  onDeliverCard: (card: KanbanCardSummary) => void;
  onDeleteCard: (card: KanbanCardSummary) => void;
  onMoveNextCard: (card: KanbanCardSummary) => void;
  onOpenView: (card: KanbanCardSummary) => void;
};

const KanbanCard = memo(function KanbanCard({
  card,
  cardIndex,
  columnId,
  deliverPending,
  dragDisabled,
  isLastColumn,
  onDeliverCard,
  onDeleteCard,
  onMoveNextCard,
  onOpenView,
}: KanbanCardProps) {
  const { isDragging, isDropping, ref } = useSortable({
    accept: "card",
    disabled: dragDisabled,
    group: getColumnDndId(columnId),
    id: getCardDndId(card.id),
    index: cardIndex,
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
          <Tooltip label={`Tecido: ${card.material?.trim() || "Não informado"}`}>
            <span className="quadro-producao-card__chip">{normalizePersonalizacaoLabel(card.arte)}</span>
          </Tooltip>
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
            {card.isManualCard ? (
              <IconButton appearance="bare" label="Excluir cartão manual" className="quadro-producao-icon-button" onClick={() => onDeleteCard(card)} onMouseDown={stopCardDrag} onPointerDown={stopCardDrag}>
                <Trash2 aria-hidden="true" size={15} />
              </IconButton>
            ) : null}
            {isLastColumn ? (
              card.isManualCard ? null : (
              <IconButton
                appearance="bare"
                label="Marcar como entregue"
                className="quadro-producao-icon-button quadro-producao-icon-button--deliver"
                disabled={deliverPending}
                onClick={() => onDeliverCard(card)}
                onMouseDown={stopCardDrag}
                onPointerDown={stopCardDrag}
              >
                <Check aria-hidden="true" size={15} />
              </IconButton>
              )
            ) : (
              <IconButton
                appearance="bare"
                label="Mover para a próxima coluna"
                className="quadro-producao-icon-button quadro-producao-icon-button--success"
                onClick={() => onMoveNextCard(card)}
                onMouseDown={stopCardDrag}
                onPointerDown={stopCardDrag}
              >
                <ArrowRight aria-hidden="true" size={15} />
              </IconButton>
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
      <IconButton
        appearance="bare"
        className="quadro-producao-icon-button"
        label={`Visualizar imagem de ${card.clienteNome}`}
        tooltip={false}
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
      >
        <Eye aria-hidden="true" size={15} />
      </IconButton>
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
