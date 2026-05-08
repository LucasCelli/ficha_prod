import Link from "next/link";
import { CalendarDays, History, ListFilter, Plus } from "lucide-react";
import { Badge, DataTable, EmptyState, Pagination } from "@/components/ui";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import { getKanbanColumnLabel } from "@/features/quadro-producao/config";
import { FichasFilterToolbar } from "./fichas-filter-toolbar";
import { FichaRowActions } from "./ficha-row-actions";
import { FichaRowThumbnail } from "./ficha-row-thumbnail";
import { FichaSaveToast } from "./ficha-save-toast";
import {
  FICHAS_PAGE_SIZE,
  getFichaOverdueDays,
  isFichaOverdue,
  type FichaFilters,
  type FichaListItem,
  type FichaListResult,
  type FichaStatus,
} from "./data";

type FichasOverviewProps = {
  filters: FichaFilters;
  result: FichaListResult;
};

const columns = [
  { key: "cliente", label: "Ficha", width: "31%" },
  { key: "entrega", label: "Entrega", width: "13%" },
  { key: "status", label: "Status", width: "11%" },
  { key: "personalizacao", label: "Etapas", width: "15%" },
  { key: "responsavel", label: "Responsável", width: "12%" },
  { key: "acao", label: "Ações", width: "236px" },
];

const statusLabels: Record<FichaStatus, string> = {
  cancelado: "Cancelado",
  entregue: "Entregue",
  pendente: "Pendente",
};

const statusTones: Record<FichaStatus, "danger" | "success" | "warning"> = {
  cancelado: "danger",
  entregue: "success",
  pendente: "warning",
};

export function FichasOverview({ filters, result }: FichasOverviewProps) {
  const shortcuts = buildOperationalShortcuts(new Date());

  return (
    <section className="fichas-view" aria-labelledby="fichas-title">
      <FichaSaveToast />
      <header className="fichas-view__header">
        <div className="page-heading">
          <div className="page-heading__copy">
            <p className="eyebrow">Módulo prioritário</p>
            <h1 id="fichas-title" className="app-title">
              Fichas
            </h1>
          </div>
          <Link className="ui-button ui-button--primary" href="/fichas/nova">
            <Plus aria-hidden="true" size={18} />
            Nova ficha
          </Link>
        </div>
      </header>

      <nav className="quick-filters" aria-label="Atalhos de período">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;

          return (
            <Link
              key={shortcut.label}
              aria-current={matchesShortcut(filters, shortcut.filters) ? "page" : undefined}
              className={`quick-filter${shortcut.label === "Atrasadas" ? " quick-filter--overdue" : ""}`}
              href={hrefForFilters(filters, shortcut.filters)}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{shortcut.label}</span>
            </Link>
          );
        })}
      </nav>

      <FichasFilterToolbar
        canExportPdf={result.kind === "ok" && result.total > 0}
        filters={filters}
        pdfHref={hrefForPdf(filters)}
      />

      {renderFichasContent(result, filters)}
    </section>
  );
}

type ShortcutFilters = Pick<FichaFilters, "dataFim" | "dataInicio" | "status">;

type OperationalShortcut = {
  filters: ShortcutFilters;
  icon: typeof CalendarDays;
  label: string;
};

function buildOperationalShortcuts(today: Date): OperationalShortcut[] {
  const currentWeekStart = startOfWeek(today);
  const currentWeekEnd = addDays(currentWeekStart, 6);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const nextWeekEnd = addDays(nextWeekStart, 6);
  return [
    {
      filters: {},
      icon: ListFilter,
      label: "Todas",
    },
    {
      filters: {
        dataFim: formatDateInput(currentWeekEnd),
        dataInicio: formatDateInput(currentWeekStart),
      },
      icon: CalendarDays,
      label: "Esta semana",
    },
    {
      filters: {
        dataFim: formatDateInput(nextWeekEnd),
        dataInicio: formatDateInput(nextWeekStart),
      },
      icon: CalendarDays,
      label: "Próxima semana",
    },
    {
      filters: {
        status: "atrasado",
      },
      icon: History,
      label: "Atrasadas",
    },
  ];
}

function hrefForFilters(currentFilters: FichaFilters, shortcutFilters: ShortcutFilters) {
  const params = new URLSearchParams();

  if (currentFilters.busca) params.set("busca", currentFilters.busca);
  if (currentFilters.evento === true) params.set("evento", "true");
  if (shortcutFilters.status) params.set("status", shortcutFilters.status);
  if (shortcutFilters.dataInicio) params.set("dataInicio", shortcutFilters.dataInicio);
  if (shortcutFilters.dataFim) params.set("dataFim", shortcutFilters.dataFim);

  const query = params.toString();
  return query ? `/fichas?${query}` : "/fichas";
}

function hrefForPdf(filters: FichaFilters) {
  const params = new URLSearchParams();

  if (filters.busca) params.set("busca", filters.busca);
  if (filters.evento === true) params.set("evento", "true");
  if (filters.status) params.set("status", filters.status);
  if (filters.dataInicio) params.set("dataInicio", filters.dataInicio);
  if (filters.dataFim) params.set("dataFim", filters.dataFim);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));

  const query = params.toString();
  return query ? `/fichas/pdf?${query}` : "/fichas/pdf";
}

function matchesShortcut(current: FichaFilters, shortcut: ShortcutFilters) {
  if (!shortcut.status && !shortcut.dataInicio && !shortcut.dataFim) {
    return !current.status && !current.dataInicio && !current.dataFim;
  }

  return (
    (current.status ?? "") === (shortcut.status ?? "") &&
    (current.dataInicio ?? "") === (shortcut.dataInicio ?? "") &&
    (current.dataFim ?? "") === (shortcut.dataFim ?? "")
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(date), mondayOffset);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderFichasContent(result: FichaListResult, filters: FichaFilters) {
  if (result.kind === "not-configured") {
    return (
      <EmptyState
        title="Fichas indisponíveis"
        description="Tente novamente."
      />
    );
  }

  if (result.kind === "error") {
    return (
      <EmptyState
        title="Não foi possível carregar fichas"
        description={result.message}
      />
    );
  }

  if (result.fichas.length === 0) {
    return (
      <EmptyState
        actions={
          <Link className="ui-button ui-button--secondary" href="/fichas">
            Limpar filtros
          </Link>
        }
        title="Nenhuma ficha encontrada"
        description="Ajuste os filtros."
      />
    );
  }

  return (
    <div className="fichas-list-container" aria-label="Lista de fichas">
      <div className="results-summary" aria-label="Resumo da paginação">
        <span>
          Exibindo {formatCount(result.fichas.length)} de {formatCount(result.total)} fichas encontradas
        </span>
      </div>

      <DataTable
        caption={`Lista principal de fichas operacionais`}
        columns={columns}
      >
        {result.fichas.map((ficha) => (
          <FichaRow key={ficha.id} ficha={ficha} currentFilters={filters} />
        ))}
      </DataTable>

      <div className="pagination-wrapper">
        <Pagination
          basePath="/fichas"
          currentPage={filters.page ?? 1}
          pageSize={FICHAS_PAGE_SIZE}
          params={getFichaPaginationParams(filters)}
          totalItems={result.total}
        />
      </div>
    </div>
  );
}

function getFichaPaginationParams(filters: FichaFilters) {
  return {
    busca: filters.busca,
    dataFim: filters.dataFim,
    dataInicio: filters.dataInicio,
    evento: filters.evento === true ? "true" : undefined,
    page: filters.page && filters.page > 1 ? String(filters.page) : undefined,
    status: filters.status,
  };
}

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(/ de /g, " ");
}

function formatOverdueDays(days: number) {
  return days === 1 ? "Atrasado há 1 dia" : `Atrasado há ${formatCount(days)} dias`;
}

function getFichaItemsTotal(ficha: FichaListItem) {
  return ficha.ficha_itens?.reduce((total, item) => total + (item.quantidade ?? 0), 0) ?? 0;
}

function formatItemsTotal(total: number) {
  return total === 1 ? "1 item" : `${formatCount(total)} itens`;
}

function FichaRow({ ficha, currentFilters }: { ficha: FichaListItem; currentFilters: FichaFilters }) {
  const thumbUrl = ficha.ficha_imagens?.[0]?.url;
  const itemsTotal = getFichaItemsTotal(ficha);
  const isOverdue = isFichaOverdue(ficha);
  const overdueDays = getFichaOverdueDays(ficha);
  const statusLabel = isOverdue ? "Atrasado" : statusLabels[ficha.status];
  const statusTone = isOverdue ? "danger" : statusTones[ficha.status];
  const kanbanStageLabel = getKanbanColumnLabel(
    ficha.kanban_column?.slug ?? ficha.kanban_status,
    ficha.arte,
    ficha.kanban_column?.name,
  );

  const searchParams = new URLSearchParams();
  const paramsObj = getFichaPaginationParams(currentFilters);
  Object.entries(paramsObj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "undefined") {
      searchParams.set(k, String(v));
    }
  });
  searchParams.set("print", ficha.id);
  const href = `/fichas?${searchParams.toString()}`;
  const printHref = `/fichas/${encodeURIComponent(ficha.id)}/imprimir`;

  return (
    <tr>
      <td>
        <div className="ficha-row__client">
          <FichaRowThumbnail alt={ficha.cliente_nome_snapshot} imageUrl={thumbUrl} />
          <span className="ui-table__primary">
            <Link className="ui-table__link" href={href} prefetch={false} scroll={false}>
              {ficha.cliente_nome_snapshot}
            </Link>
            <span className="ficha-row__meta">
              <Badge className="ficha-row__meta-badge" tone="neutral">{formatItemsTotal(itemsTotal)}</Badge>
              <Badge className="ficha-row__meta-badge" tone="neutral">
                {ficha.numero_venda ? `Venda ${ficha.numero_venda}` : "Sem venda"}
              </Badge>
            </span>
          </span>
        </div>
      </td>
      <td>
        <span className="ui-table__primary">
          <span>{formatDate(ficha.data_entrega)}</span>
          {isOverdue ? <span className="ficha-overdue-note">{formatOverdueDays(overdueDays)}</span> : null}
        </span>
      </td>
      <td>
        <div className="ficha-status-line">
          <Badge tone={statusTone}>{statusLabel}</Badge>
          {ficha.evento ? <Badge tone="info">Evento</Badge> : null}
        </div>
      </td>
      <td>
        <span className="ui-table__primary ficha-stage-cell">
          <strong className="ficha-stage-cell__type">{normalizePersonalizacaoLabel(ficha.arte)}</strong>
          <Badge aria-label={`Etapa: ${kanbanStageLabel}`} className="ficha-stage-cell__badge" tone="info">
            {kanbanStageLabel}
          </Badge>
        </span>
      </td>
      <td>{ficha.vendedor ?? <span className="ui-table__muted">—</span>}</td>
      <td>
        <FichaRowActions
          fichaId={ficha.id}
          fichaLabel={ficha.cliente_nome_snapshot}
          fullDeliverButton={currentFilters.status === "atrasado"}
          printHref={printHref}
          previewHref={href}
          returnTo={getReturnTo(currentFilters)}
          status={ficha.status}
        />
      </td>
    </tr>
  );
}

function getReturnTo(filters: FichaFilters) {
  const params = new URLSearchParams();
  const paramsObj = getFichaPaginationParams(filters);

  Object.entries(paramsObj).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "undefined") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `/fichas?${query}` : "/fichas";
}
