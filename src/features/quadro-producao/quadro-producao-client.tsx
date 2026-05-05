"use client";

import Link from "next/link";
import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCheck,
  Eye,
  Filter,
  GripVertical,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Rows3,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  Badge,
  Card,
  EmptyState,
  Modal,
  Tooltip,
} from "@/components/ui";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import type { InsumoStatus } from "./config";
import { INSUMO_STATUS_LABELS, INSUMO_STATUS_VALUES } from "./config";
import type {
  KanbanBoardColumn,
  KanbanCardSummary,
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
  queryKey: readonly unknown[];
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDateLong(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getNextInsumoStatus(current: InsumoStatus): InsumoStatus {
  const currentIndex = INSUMO_STATUS_VALUES.indexOf(current);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % INSUMO_STATUS_VALUES.length : 0;
  return INSUMO_STATUS_VALUES[nextIndex] as InsumoStatus;
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

function applyOptimisticDelivered(result: QuadroProducaoResult, cardId: string) {
  if (result.kind !== "ok") {
    return result;
  }

  const next = cloneResult(result);

  if (next.kind !== "ok") {
    return result;
  }

  next.snapshot.columns.forEach((column) => {
    const before = column.cards.length;
    column.cards = column.cards.filter((card) => card.id !== cardId);
    if (column.cards.length !== before) {
      next.snapshot.totalVisible -= 1;
    }
    column.openCount = column.cards.length;
    column.cards = column.cards.map((card, cardIndex) => ({
      ...card,
      kanbanOrder: cardIndex,
    }));
  });

  return next;
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
    dataEntrega: new Date().toISOString().slice(0, 10),
    evento: false,
    insumoStatus: "tudo_ok",
    material: "",
    title: "",
  };
}

export function QuadroProducaoClient({ initialResult }: QuadroProducaoClientProps) {
  const [filters, setFilters] = useQueryStates(quadroProducaoSearchParamParsers);
  const [isDesktopBoard, setIsDesktopBoard] = useState(false);
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [createColumnName, setCreateColumnName] = useState("");
  const [renameTarget, setRenameTarget] = useState<KanbanBoardColumn | null>(null);
  const [renameColumnName, setRenameColumnName] = useState("");
  const [createManualCardOpen, setCreateManualCardOpen] = useState(false);
  const [manualCardDraft, setManualCardDraft] = useState<ManualCardDraft>(() => getEmptyManualCardDraft(""));
  const [viewCard, setViewCard] = useState<KanbanCardSummary | null>(null);
  const [deliverTarget, setDeliverTarget] = useState<KanbanCardSummary | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1120px)");
    const sync = () => setIsDesktopBoard(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  const boardQuery = useQuery({
    initialData: initialResult,
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
  const currentColumns = currentResult.kind === "ok" ? currentResult.snapshot.columns : [];
  const defaultColumnId = currentColumns[0]?.id ?? "";

  const moveCardMutation = useMutation<{ ok: true }, Error, { cardId: string; destinationColumnId: string; destinationIndex: number }, MutationContext>({
    mutationFn: (input: { cardId: string; destinationColumnId: string; destinationIndex: number }) =>
      patchKanbanCardMove(input.cardId, input.destinationColumnId, input.destinationIndex),
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
        queryClient.setQueryData(queryKey, applyOptimisticCardMove(previous, input));
      }

      return { previous, queryKey };
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quadro-producao"] });
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

  const deliverMutation = useMutation<{ ok: true }, Error, string, MutationContext>({
    mutationFn: (cardId: string) => postKanbanCardEntregar(cardId),
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onMutate: async (cardId) => {
      const queryKey = ["quadro-producao", filters];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<QuadroProducaoResult>(queryKey);

      if (previous) {
        queryClient.setQueryData(queryKey, applyOptimisticDelivered(previous, cardId));
      }

      return { previous, queryKey };
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quadro-producao"] });
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

  function handleRefresh() {
    void boardQuery.refetch();
  }

  function handleClearFilters() {
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

  function handleDragEnd(result: DropResult) {
    if (!result.destination || result.type !== "CARD") {
      return;
    }

    const sourceColumnId = result.source.droppableId.replace("column:", "");
    const destinationColumnId = result.destination.droppableId.replace("column:", "");

    if (sourceColumnId === destinationColumnId && result.source.index === result.destination.index) {
      return;
    }

    moveCardMutation.mutate({
      cardId: result.draggableId.replace("card:", ""),
      destinationColumnId,
      destinationIndex: result.destination.index,
    });
  }

  if (currentResult.kind === "not-configured") {
    return (
      <section className="quadro-producao-view" aria-labelledby="quadro-producao-title">
        <header className="quadro-producao-view__header">
          <div className="page-heading">
            <div className="page-heading__copy">
              <Badge tone="info">Novo módulo</Badge>
              <h1 id="quadro-producao-title" className="app-title">
                Quadro de Produção
              </h1>
              <p className="app-summary">
                O quadro já foi estruturado, mas ainda depende da configuração ativa do Supabase para ler colunas e cartões.
              </p>
            </div>
          </div>
        </header>
        <EmptyState
          title="Supabase ainda não configurado"
          description="Configure as variáveis do ambiente atual para carregar o Quadro de Produção com colunas dinâmicas."
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
              <p className="app-summary">A leitura do quadro falhou e precisa ser restabelecida antes de continuar operando.</p>
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

  return (
    <>
      <section className="quadro-producao-view" aria-labelledby="quadro-producao-title">
        <header className="quadro-producao-view__header">
          <div className="page-heading">
            <div className="page-heading__copy">
              <Badge tone="info">Operação visual</Badge>
              <h1 id="quadro-producao-title" className="app-title">
                Quadro de Produção
              </h1>
              <p className="app-summary">
                Colunas persistidas em banco, leitura rápida dos pedidos e movimentação visual para acompanhar a produção em aberto.
              </p>
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
                <Rows3 aria-hidden="true" size={18} />
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
            <label className="quadro-producao-field quadro-producao-field--search">
              <span>Buscar</span>
              <div className="quadro-producao-search-wrap">
                <Filter aria-hidden="true" size={16} />
                <input
                  className="quadro-producao-input"
                  onChange={(event) => void setFilters({ busca: event.target.value || null })}
                  placeholder="Cliente, venda, tecido, arte..."
                  value={filters.busca}
                />
              </div>
            </label>

            <label className="quadro-producao-field">
              <span>Tecido</span>
              <select
                className="quadro-producao-select"
                onChange={(event) => void setFilters({ tecido: event.target.value || null })}
                value={filters.tecido}
              >
                <option value="">Todos</option>
                {currentResult.snapshot.filterOptions.tecidos.map((tecido) => (
                  <option key={tecido} value={tecido}>
                    {tecido}
                  </option>
                ))}
              </select>
            </label>

            <label className="quadro-producao-field">
              <span>Arte</span>
              <select
                className="quadro-producao-select"
                onChange={(event) => void setFilters({ arte: event.target.value || null })}
                value={filters.arte}
              >
                <option value="">Todas</option>
                {currentResult.snapshot.filterOptions.artes.map((arte) => (
                  <option key={arte} value={arte}>
                    {normalizePersonalizacaoLabel(arte)}
                  </option>
                ))}
              </select>
            </label>

            <label className="quadro-producao-field">
              <span>Pendencia</span>
              <select
                className="quadro-producao-select"
                onChange={(event) => void setFilters({ insumo: event.target.value || null })}
                value={filters.insumo}
              >
                <option value="">Todos</option>
                {currentResult.snapshot.filterOptions.insumos.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="quadro-producao-toolbar-actions">
              <button
                aria-pressed={filters.semana}
                className={`quadro-producao-week-toggle${filters.semana ? " is-active" : ""}`}
                onClick={() => void setFilters({ semana: filters.semana ? null : true })}
                type="button"
              >
                <CalendarDays aria-hidden="true" size={16} />
                Para essa semana
              </button>
              <Badge tone="info">{formatCount(currentResult.snapshot.totalVisible)} em aberto</Badge>
              <button className="ui-button ui-button--ghost" onClick={handleClearFilters} type="button">
                Limpar filtros
              </button>
              <button className="ui-button ui-button--secondary" onClick={handleRefresh} type="button">
                <RefreshCw
                  aria-hidden="true"
                  className={boardQuery.isFetching ? "quadro-producao-spin" : undefined}
                  size={16}
                />
                Atualizar
              </button>
            </div>
          </div>
        </Card>

        <DragDropContext onDragEnd={handleDragEnd}>
          {isDesktopBoard ? (
            <Group
              className="quadro-producao-panels"
              defaultLayout={Object.fromEntries(
                currentColumns.map((column) => [column.id, 100 / Math.max(currentColumns.length, 1)]),
              )}
              id="quadro-producao-layout"
              orientation="horizontal"
            >
              {currentColumns.map((column, index) => (
                <FragmentColumnPanel
                  column={column}
                  currentColumns={currentColumns}
                  deliverMutationPending={deliverMutation.isPending}
                  index={index}
                  insumoMutationPending={insumoMutation.isPending}
                  key={column.id}
                  moveCardMutationPending={moveCardMutation.isPending}
                  onCycleInsumo={(card) =>
                    insumoMutation.mutate({
                      cardId: card.id,
                      insumoStatus: getNextInsumoStatus(card.insumoStatus),
                    })
                  }
                  onOpenDeliver={setDeliverTarget}
                  onOpenRename={handleOpenRenameModal}
                  onOpenView={setViewCard}
                  onShiftColumn={handleColumnShift}
                  onSortByDate={(columnId) => sortColumnMutation.mutate(columnId)}
                />
              ))}
            </Group>
          ) : (
            <div className="quadro-producao-board-scroll">
              <div className="quadro-producao-board">
                {currentColumns.map((column, index) => (
                  <ColumnSurface
                    column={column}
                    currentColumns={currentColumns}
                    deliverMutationPending={deliverMutation.isPending}
                    index={index}
                    insumoMutationPending={insumoMutation.isPending}
                    key={column.id}
                    moveCardMutationPending={moveCardMutation.isPending}
                    onCycleInsumo={(card) =>
                      insumoMutation.mutate({
                        cardId: card.id,
                        insumoStatus: getNextInsumoStatus(card.insumoStatus),
                      })
                    }
                    onOpenDeliver={setDeliverTarget}
                    onOpenRename={handleOpenRenameModal}
                    onOpenView={setViewCard}
                    onShiftColumn={handleColumnShift}
                    onSortByDate={(columnId) => sortColumnMutation.mutate(columnId)}
                  />
                ))}
              </div>
            </div>
          )}
        </DragDropContext>
      </section>

      {createColumnOpen ? (
        <Modal onClose={() => setCreateColumnOpen(false)} size="sm" title="Nova coluna">
          <section className="confirm-dialog" aria-describedby="quadro-producao-create-column-description">
            <header className="confirm-dialog__header">
              <div>
                <span className="confirm-dialog__eyebrow">Coluna do quadro</span>
                <h2>Criar nova coluna</h2>
              </div>
            </header>

            <p id="quadro-producao-create-column-description">
              A nova coluna entra no quadro atual com ordem persistida e já pode receber cartões em seguida.
            </p>

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
          <section className="confirm-dialog" aria-describedby="quadro-producao-rename-column-description">
            <header className="confirm-dialog__header">
              <div>
                <span className="confirm-dialog__eyebrow">Coluna do quadro</span>
                <h2>Renomear coluna</h2>
              </div>
            </header>

            <p id="quadro-producao-rename-column-description">
              A mudança afeta apenas o nome visível da coluna. O identificador técnico continua estável no banco.
            </p>

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
          <section className="confirm-dialog" aria-describedby="quadro-producao-manual-card-description">
            <header className="confirm-dialog__header">
              <div>
                <span className="confirm-dialog__eyebrow">Entrada operacional rápida</span>
                <h2>Novo cartão manual</h2>
              </div>
            </header>

            <p id="quadro-producao-manual-card-description">
              Use este fluxo quando a operação precisar registrar uma demanda no quadro antes de virar uma ficha completa.
            </p>

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
                      {column.name}
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
                <span>Insumos</span>
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
            <header className="quadro-producao-view-modal__header">
              <div>
                <Badge tone={viewCard.isManualCard ? "warning" : "info"}>
                  {viewCard.isManualCard ? "Cartão manual" : "Ficha real"}
                </Badge>
                <h2>{viewCard.clienteNome}</h2>
              </div>
              <div className="quadro-producao-view-modal__tags">
                <Badge tone="neutral">{formatDateLong(viewCard.dataEntrega)}</Badge>
                <Badge tone="neutral">{INSUMO_STATUS_LABELS[viewCard.insumoStatus]}</Badge>
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

            <div className="quadro-producao-view-modal__notes">
              <h3>Observações</h3>
              <p>{viewCard.observacoes || "Sem observações registradas."}</p>
            </div>

            {!viewCard.isManualCard ? (
              <div className="confirm-dialog__actions">
                <Link className="ui-button ui-button--secondary" href={`/fichas?print=${encodeURIComponent(viewCard.id)}`} scroll={false}>
                  Abrir prévia
                </Link>
                <Link className="ui-button ui-button--primary" href={`/fichas/${encodeURIComponent(viewCard.id)}`}>
                  Abrir ficha completa
                </Link>
              </div>
            ) : null}
          </section>
        </Modal>
      ) : null}

      {deliverTarget ? (
        <AlertDialog onClose={() => setDeliverTarget(null)} size="sm" title="Marcar como entregue">
          <section className="confirm-dialog" aria-describedby="quadro-producao-deliver-description">
            <header className="confirm-dialog__header">
              <div>
                <span className="confirm-dialog__eyebrow">Confirmação necessária</span>
                <h2>Marcar como entregue</h2>
              </div>
            </header>

            <p id="quadro-producao-deliver-description">
              O cartão <strong>{deliverTarget.clienteNome}</strong> sairá do quadro de produção em aberto após a confirmação.
            </p>

            <div className="confirm-dialog__actions">
              <AlertDialogCancel asChild>
                <button className="ui-button ui-button--ghost" type="button">
                  Cancelar
                </button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <button
                  className="ui-button ui-button--primary"
                  onClick={() => {
                    deliverMutation.mutate(deliverTarget.id);
                    setDeliverTarget(null);
                  }}
                  type="button"
                >
                  Confirmar entrega
                </button>
              </AlertDialogAction>
            </div>
          </section>
        </AlertDialog>
      ) : null}
    </>
  );
}

function FragmentColumnPanel(props: ColumnSurfaceProps) {
  return (
    <>
      <Panel
        className="quadro-producao-panel"
        defaultSize={100 / Math.max(props.currentColumns.length, 1)}
        id={props.column.id}
        minSize={18}
      >
        <ColumnSurface {...props} />
      </Panel>
      {props.index < props.currentColumns.length - 1 ? <Separator className="quadro-producao-resize-handle" /> : null}
    </>
  );
}

type ColumnSurfaceProps = {
  column: KanbanBoardColumn;
  currentColumns: KanbanBoardColumn[];
  deliverMutationPending: boolean;
  index: number;
  insumoMutationPending: boolean;
  moveCardMutationPending: boolean;
  onCycleInsumo: (card: KanbanCardSummary) => void;
  onOpenDeliver: (card: KanbanCardSummary) => void;
  onOpenRename: (column: KanbanBoardColumn) => void;
  onOpenView: (card: KanbanCardSummary) => void;
  onShiftColumn: (columnId: string, direction: "left" | "right") => void;
  onSortByDate: (columnId: string) => void;
};

function ColumnSurface({
  column,
  currentColumns,
  deliverMutationPending,
  index,
  insumoMutationPending,
  moveCardMutationPending,
  onCycleInsumo,
  onOpenDeliver,
  onOpenRename,
  onOpenView,
  onShiftColumn,
  onSortByDate,
}: ColumnSurfaceProps) {
  return (
    <section className="quadro-producao-column">
      <header className="quadro-producao-column__header">
        <div className="quadro-producao-column__heading">
          <GripVertical aria-hidden="true" className="quadro-producao-column__grip" size={14} />
          <h2>{column.name}</h2>
        </div>

        <div className="quadro-producao-column__meta">
          <Badge tone="neutral">{formatCount(column.openCount)}</Badge>
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
        </div>
      </header>

      <Droppable droppableId={`column:${column.id}`} type="CARD">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            className={`quadro-producao-column__list${snapshot.isDraggingOver ? " is-drag-over" : ""}`}
            ref={provided.innerRef}
          >
            {column.cards.length === 0 ? <div className="quadro-producao-empty-column">Nenhum cartão nesta etapa.</div> : null}
            {column.cards.map((card, cardIndex) => (
              <Draggable draggableId={`card:${card.id}`} index={cardIndex} key={card.id}>
                {(dragProvided, dragSnapshot) => (
                  <article
                    className={`quadro-producao-card${dragSnapshot.isDragging ? " is-dragging" : ""}`}
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <div className="quadro-producao-card__body">
                      <div className="quadro-producao-card__top">
                        <div className="quadro-producao-card__identity">
                          <div className="quadro-producao-card__eyebrow">
                            <span>{card.numeroVenda ? `Venda ${card.numeroVenda}` : card.isManualCard ? "Cartao manual" : "Sem venda"}</span>
                            <span>Entrega {formatDate(card.dataEntrega)}</span>
                          </div>
                          <button
                            aria-label={`Abrir detalhes de ${card.clienteNome}`}
                            className="quadro-producao-card__title"
                            onClick={() => onOpenView(card)}
                            type="button"
                          >
                            {card.clienteNome}
                          </button>
                        </div>
                      </div>

                      <div className="quadro-producao-card__chips">
                        <Badge tone="neutral">{normalizePersonalizacaoLabel(card.arte)}</Badge>
                        {card.material ? <Badge tone="neutral">{card.material}</Badge> : null}
                        {card.evento ? <Badge tone="info">Evento</Badge> : null}
                        {card.insumoStatus !== "tudo_ok" ? (
                          <Badge tone="warning">{INSUMO_STATUS_LABELS[card.insumoStatus]}</Badge>
                        ) : null}
                      </div>

                      <div className="quadro-producao-card__footer">
                        <div className="quadro-producao-card__actions">
                          <Tooltip label="Abrir detalhes do cartao">
                            <button
                              aria-label={`Abrir detalhes de ${card.clienteNome}`}
                              className="quadro-producao-icon-button"
                              onClick={() => onOpenView(card)}
                              type="button"
                            >
                              <Eye aria-hidden="true" size={16} />
                            </button>
                          </Tooltip>
                          <Tooltip label="Alterar pendencia de material">
                            <button
                              aria-label={`Atualizar pendencia de material de ${card.clienteNome}`}
                              className="quadro-producao-icon-button"
                              disabled={insumoMutationPending}
                              onClick={() => onCycleInsumo(card)}
                              type="button"
                            >
                              <PackageCheck aria-hidden="true" size={16} />
                            </button>
                          </Tooltip>
                          <Tooltip label="Marcar cartao como entregue">
                            <button
                              aria-label={`Marcar ${card.clienteNome} como entregue`}
                              className="quadro-producao-icon-button quadro-producao-icon-button--success"
                              disabled={deliverMutationPending}
                              onClick={() => onOpenDeliver(card)}
                              type="button"
                            >
                              <CheckCheck aria-hidden="true" size={16} />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </article>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {moveCardMutationPending ? <div className="quadro-producao-column__pending">Sincronizando movimento...</div> : null}
          </div>
        )}
      </Droppable>
    </section>
  );
}
