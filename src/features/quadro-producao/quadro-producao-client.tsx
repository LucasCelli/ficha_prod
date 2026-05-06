"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { attachClosestEdge, extractClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Eye,
  Filter,
  GripVertical,
  Pencil,
  Plus,
  RefreshCw,
  Rows3,
  Star,
} from "lucide-react";
import {
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
  QuadroProducaoFilters,
  QuadroProducaoResult,
} from "./data";
import {
  fetchQuadroProducao,
  patchKanbanCardInsumoStatus,
  patchKanbanCardMove,
  patchKanbanColumn,
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
  queryKey: readonly unknown[];
};

type KanbanDragData = {
  cardId: string;
  columnId: string;
  height?: number;
  index: number;
  kind: "quadro-card";
};

type KanbanCardTargetData = KanbanDragData & {
  targetKind: "card";
};

type KanbanColumnTargetData = {
  columnId: string;
  index: number;
  kind: "quadro-column";
  targetKind: "column";
};

type KanbanDropData = KanbanCardTargetData | KanbanColumnTargetData;

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function getRemainingDays(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
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

function isKanbanDragData(value: Record<string | symbol, unknown>): value is KanbanDragData {
  return (
    value.kind === "quadro-card" &&
    typeof value.cardId === "string" &&
    typeof value.columnId === "string" &&
    typeof value.index === "number"
  );
}

function isKanbanDropData(value: Record<string | symbol, unknown>): value is KanbanDropData {
  return (
    (value.kind === "quadro-card" || value.kind === "quadro-column") &&
    typeof value.columnId === "string" &&
    typeof value.index === "number"
  );
}

function getKanbanDestinationIndex(args: {
  closestEdge: Edge | null;
  sourceColumnId: string;
  sourceIndex: number;
  targetColumnId: string;
  targetIndex: number;
}) {
  let destinationIndex = args.targetIndex;

  if (args.closestEdge === "bottom") {
    destinationIndex += 1;
  }

  if (args.sourceColumnId === args.targetColumnId && args.sourceIndex < destinationIndex) {
    destinationIndex -= 1;
  }

  return Math.max(0, destinationIndex);
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

function formatDateLong(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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
  const [isDesktopBoard, setIsDesktopBoard] = useState(false);
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [createColumnName, setCreateColumnName] = useState("");
  const [renameTarget, setRenameTarget] = useState<KanbanBoardColumn | null>(null);
  const [renameColumnName, setRenameColumnName] = useState("");
  const [createManualCardOpen, setCreateManualCardOpen] = useState(false);
  const [manualCardDraft, setManualCardDraft] = useState<ManualCardDraft>(() => getEmptyManualCardDraft(""));
  const [viewCard, setViewCard] = useState<KanbanCardSummary | null>(null);
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
                <p className="quadro-producao-toolbar__summary">Painel operacional das fichas em aberto.</p>
              </div>
              <Badge tone="info">{formatCount(currentResult.snapshot.totalVisible)} em aberto</Badge>
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
              </div>
            </label>

            <label className="quadro-producao-field">
              <span>Personalização</span>
              <select
                aria-label="Filtrar por arte"
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
              <span>Status da ficha</span>
              <select
                aria-label="Filtrar por status da ficha"
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
          </div>
        </Card>

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
                index={index}
                insumoMutationPending={insumoMutation.isPending}
                key={column.id}
                onChangeInsumo={(card, insumoStatus) =>
                  insumoMutation.mutate({
                    cardId: card.id,
                    insumoStatus,
                  })
                }
                onMoveCard={(move) => moveCardMutation.mutate(move)}
                onMoveNextCard={(card) => {
                  const nextColumn = currentColumns[index + 1];
                  if (!nextColumn) {
                    return;
                  }

                  moveCardMutation.mutate({
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
          </Group>
        ) : (
          <div className="quadro-producao-board-scroll">
            <div className="quadro-producao-board">
              {currentColumns.map((column, index) => (
                <ColumnSurface
                  column={column}
                  currentColumns={currentColumns}
                  index={index}
                  insumoMutationPending={insumoMutation.isPending}
                  key={column.id}
                  onChangeInsumo={(card, insumoStatus) =>
                    insumoMutation.mutate({
                      cardId: card.id,
                      insumoStatus,
                    })
                  }
                  onMoveCard={(move) => moveCardMutation.mutate(move)}
                  onMoveNextCard={(card) => {
                    const nextColumn = currentColumns[index + 1];
                    if (!nextColumn) {
                      return;
                    }

                    moveCardMutation.mutate({
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
        )}
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
                  <Badge tone="neutral">{viewCardCurrentColumn?.name ?? "Sem coluna"}</Badge>
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

                <Tooltip label={viewCardNextColumn ? `Mover para ${viewCardNextColumn.name}` : "Este cartão já está na última coluna"}>
                  <button
                    aria-label={viewCardNextColumn ? `Mover ${viewCard.clienteNome} para ${viewCardNextColumn.name}` : "Cartão já está na última coluna"}
                    className="ui-button ui-button--primary quadro-producao-view-modal__move"
                    disabled={!viewCardNextColumn || moveCardMutation.isPending}
                    onClick={() => {
                      if (!viewCardNextColumn) {
                        return;
                      }

                      moveCardMutation.mutate({
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
                    <ArrowRight aria-hidden="true" size={16} />
                    {viewCardNextColumn ? "Mover para próxima etapa" : "Última coluna"}
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

function FragmentColumnPanel(props: ColumnSurfaceProps) {
  return (
    <>
      <Panel
        className="quadro-producao-panel"
        defaultSize={100 / Math.max(props.currentColumns.length, 1)}
        id={props.column.id}
        minSize={Math.min(20, 100 / Math.max(props.currentColumns.length, 1))}
      >
        <ColumnSurface {...props} />
      </Panel>
      {props.index < props.currentColumns.length - 1 ? <Separator className="quadro-producao-resize-handle" /> : null}
    </>
  );
}

type KanbanMove = {
  cardId: string;
  destinationColumnId: string;
  destinationIndex: number;
};

type KanbanActiveShadow =
  | {
      cardId: string;
      columnId: string;
      edge: Edge | null;
      height: number;
      index: number;
      target: "card";
    }
  | {
      height: number;
      target: "column";
    };

type KanbanColumnListProps = {
  activeShadow: KanbanActiveShadow | null;
  children: React.ReactNode;
  column: KanbanBoardColumn;
  onShadowChange: (shadow: KanbanActiveShadow | null) => void;
  onMoveCard: (move: KanbanMove) => void;
};

function KanbanColumnList({ activeShadow, children, column, onMoveCard, onShadowChange }: KanbanColumnListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeShadowRef = useRef<KanbanActiveShadow | null>(activeShadow);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    activeShadowRef.current = activeShadow;
  }, [activeShadow]);

  useEffect(() => {
    const element = listRef.current;
    if (!element) {
      return;
    }

    const data: KanbanColumnTargetData = {
      columnId: column.id,
      index: column.cards.length,
      kind: "quadro-column",
      targetKind: "column",
    };

    return combine(
      dropTargetForElements({
        element,
        canDrop: ({ source }) => isKanbanDragData(source.data),
        getData: () => data,
        onDrag: ({ location, self, source }) => {
          if (location.current.dropTargets[0]?.data === self.data) {
            setIsOver(true);
            if (activeShadowRef.current?.target !== "card" && isKanbanDragData(source.data) && source.data.height) {
              onShadowChange({ height: source.data.height, target: "column" });
            }
          } else {
            setIsOver(false);
          }
        },
        onDragEnter: ({ location, self, source }) => {
          if (location.current.dropTargets[0]?.data === self.data) {
            setIsOver(true);
            if (activeShadowRef.current?.target !== "card" && isKanbanDragData(source.data) && source.data.height) {
              onShadowChange({ height: source.data.height, target: "column" });
            }
          }
        },
        onDragLeave: () => {
          setIsOver(false);
          onShadowChange(null);
        },
        onDrop: ({ location, self, source }) => {
          setIsOver(false);

          if (location.current.dropTargets[0]?.data !== self.data || !isKanbanDragData(source.data)) {
            onShadowChange(null);
            return;
          }

          const shadow = activeShadowRef.current;
          const destinationIndex =
            shadow?.target === "card"
              ? getKanbanDestinationIndex({
                  closestEdge: shadow.edge,
                  sourceColumnId: source.data.columnId,
                  sourceIndex: source.data.index,
                  targetColumnId: shadow.columnId,
                  targetIndex: shadow.index,
                })
              : source.data.columnId === column.id && source.data.index < column.cards.length
                ? column.cards.length - 1
                : column.cards.length;

          onShadowChange(null);

          if (source.data.columnId === column.id && source.data.index === destinationIndex) {
            return;
          }

          onMoveCard({
            cardId: source.data.cardId,
            destinationColumnId: column.id,
            destinationIndex,
          });
        },
      }),
      autoScrollForElements({
        element,
        canScroll: ({ source }) => isKanbanDragData(source.data),
      }),
    );
  }, [column.cards.length, column.id, onMoveCard, onShadowChange]);

  return (
    <div className="quadro-producao-column__list" data-over={isOver ? "true" : "false"} ref={listRef}>
      {children}
      {activeShadow?.target === "column" ? (
        <div aria-hidden="true" className="quadro-producao-card-shadow" style={{ minHeight: activeShadow.height }} />
      ) : null}
    </div>
  );
}

type KanbanSortableCardProps = {
  card: KanbanCardSummary;
  children: (args: {
    isDragging: boolean;
    isOver: boolean;
    setElementRef: (node: HTMLElement | null) => void;
  }) => React.ReactNode;
  columnId: string;
  index: number;
  onShadowChange: (shadow: KanbanActiveShadow | null) => void;
  onMoveCard: (move: KanbanMove) => void;
};

function KanbanSortableCard({ card, children, columnId, index, onMoveCard, onShadowChange }: KanbanSortableCardProps) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    if (!element) {
      return;
    }
    const currentElement = element;

    const data: KanbanCardTargetData = {
      cardId: card.id,
      columnId,
      index,
      kind: "quadro-card",
      targetKind: "card",
    };

    function updateShadow(selfData: Record<string | symbol, unknown>, sourceData: Record<string | symbol, unknown>) {
      const edge = extractClosestEdge(selfData);
      const height = isKanbanDragData(sourceData) && sourceData.height ? sourceData.height : currentElement.getBoundingClientRect().height;
      setIsOver(true);
      onShadowChange({ cardId: card.id, columnId, edge, height, index, target: "card" });
    }

    return combine(
      draggable({
        element,
        getInitialData: () => ({
          ...data,
          height: currentElement.getBoundingClientRect().height,
        }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => isKanbanDragData(source.data) && source.data.cardId !== card.id,
        getData: ({ input, element }) =>
          attachClosestEdge(data, {
            allowedEdges: ["top", "bottom"],
            element,
            input,
          }),
        onDrag: ({ self, source }) => updateShadow(self.data, source.data),
        onDragEnter: ({ self, source }) => updateShadow(self.data, source.data),
        onDragLeave: () => setIsOver(false),
        onDrop: ({ self, source }) => {
          setIsOver(false);
          onShadowChange(null);

          if (!isKanbanDragData(source.data) || !isKanbanDropData(self.data) || self.data.targetKind !== "card") {
            return;
          }

          const destinationIndex = getKanbanDestinationIndex({
            closestEdge: extractClosestEdge(self.data),
            sourceColumnId: source.data.columnId,
            sourceIndex: source.data.index,
            targetColumnId: columnId,
            targetIndex: index,
          });

          if (source.data.columnId === columnId && source.data.index === destinationIndex) {
            return;
          }

          onMoveCard({
            cardId: source.data.cardId,
            destinationColumnId: columnId,
            destinationIndex,
          });
        },
      }),
    );
  }, [card.id, columnId, element, index, onMoveCard, onShadowChange]);

  return <>{children({ isDragging, isOver, setElementRef: setElement })}</>;
}

type ColumnSurfaceProps = {
  column: KanbanBoardColumn;
  currentColumns: KanbanBoardColumn[];
  index: number;
  insumoMutationPending: boolean;
  onChangeInsumo: (card: KanbanCardSummary, insumoStatus: InsumoStatus) => void;
  onMoveCard: (move: { cardId: string; destinationColumnId: string; destinationIndex: number }) => void;
  onMoveNextCard: (card: KanbanCardSummary) => void;
  onOpenRename: (column: KanbanBoardColumn) => void;
  onOpenView: (card: KanbanCardSummary) => void;
  onShiftColumn: (columnId: string, direction: "left" | "right") => void;
  onSortByDate: (columnId: string) => void;
};

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
        onBlur={() => {
          setOpen(false);
          setPosition(null);
        }}
        onClick={() => onOpenView(card)}
        onFocus={() => setOpen(true)}
        onPointerEnter={(event) => {
          setOpen(true);
          updatePointerPosition(event.clientX, event.clientY);
        }}
        onPointerLeave={() => {
          setOpen(false);
          setPosition(null);
        }}
        onPointerMove={(event) => updatePointerPosition(event.clientX, event.clientY)}
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
  insumoMutationPending,
  onChangeInsumo,
  onMoveCard,
  onMoveNextCard,
  onOpenRename,
  onOpenView,
  onShiftColumn,
  onSortByDate,
}: ColumnSurfaceProps) {
  const [activeShadow, setActiveShadow] = useState<KanbanActiveShadow | null>(null);

  return (
    <section className="quadro-producao-column" style={getColumnAccentStyle(column.order_index)}>
      <header className="quadro-producao-column__header">
        <div className="quadro-producao-column__topline">
          <div className="quadro-producao-column__heading">
            <GripVertical aria-hidden="true" className="quadro-producao-column__grip" size={14} />
            <h2>{column.name}</h2>
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

      <KanbanColumnList activeShadow={activeShadow} column={column} onMoveCard={onMoveCard} onShadowChange={setActiveShadow}>
        {column.cards.length === 0 ? <div className="quadro-producao-empty-column">Nenhum cartão nesta etapa.</div> : null}
        {column.cards.map((card, cardIndex) => (
          <KanbanSortableCard
            card={card}
            columnId={column.id}
            index={cardIndex}
            key={card.id}
            onMoveCard={onMoveCard}
            onShadowChange={setActiveShadow}
          >
            {({ isDragging, isOver, setElementRef }) => {
              const deliveryUrgency = getDeliveryUrgency(card);

              return (
              <>
                {activeShadow?.target === "card" && activeShadow.cardId === card.id && activeShadow.edge === "top" ? (
                  <div aria-hidden="true" className="quadro-producao-card-shadow" style={{ minHeight: activeShadow.height }} />
                ) : null}
                <article
                  className={`quadro-producao-card${isDragging ? " is-dragging" : ""}`}
                  data-over={isOver ? "true" : "false"}
                  ref={setElementRef}
                >
                <div className="quadro-producao-card__body">
                  <div className="quadro-producao-card__identity">
                    <Tooltip label="Abrir detalhes do cartão">
                      <button
                        aria-label={`Abrir detalhes de ${card.clienteNome}`}
                        className="quadro-producao-card__title"
                        onClick={() => onOpenView(card)}
                        type="button"
                      >
                        {card.evento ? (
                          <span aria-label="Pedido de evento" className="quadro-producao-card__event-chip" role="img">
                            <Star aria-hidden="true" size={11} />
                          </span>
                        ) : null}
                        <span className="quadro-producao-card__title-text">{card.clienteNome}</span>
                      </button>
                    </Tooltip>
                  </div>

                  <div className="quadro-producao-card__meta">
                    <span className="quadro-producao-card__chip">{normalizePersonalizacaoLabel(card.arte)}</span>
                    <label className="quadro-producao-status-chip" data-status={card.insumoStatus}>
                      <span className="sr-only">Status da ficha de {card.clienteNome}</span>
                      <select
                        aria-label={`Status da ficha de ${card.clienteNome}`}
                        disabled={insumoMutationPending}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => onChangeInsumo(card, event.target.value as InsumoStatus)}
                        onMouseDown={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
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
                      <CardImagePreviewButton card={card} onOpenView={onOpenView} />
                      <Tooltip label="Mover para a próxima coluna">
                        <button
                          aria-label={`Mover ${card.clienteNome} para a próxima coluna`}
                          className="quadro-producao-icon-button quadro-producao-icon-button--success"
                          disabled={index === currentColumns.length - 1}
                          onClick={() => onMoveNextCard(card)}
                          type="button"
                        >
                          <ArrowRight aria-hidden="true" size={16} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                </article>
                {activeShadow?.target === "card" && activeShadow.cardId === card.id && activeShadow.edge === "bottom" ? (
                  <div aria-hidden="true" className="quadro-producao-card-shadow" style={{ minHeight: activeShadow.height }} />
                ) : null}
              </>
              );
            }}
          </KanbanSortableCard>
        ))}
      </KanbanColumnList>
    </section>
  );
}
