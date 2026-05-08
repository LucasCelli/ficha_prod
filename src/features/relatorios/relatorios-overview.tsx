import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { Badge, Button, DataTable, EmptyState } from "@/components/ui";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import type { FichaFilters, FichaListItem, FichaListResult, FichaStatus } from "@/features/fichas/data";

type RelatoriosOverviewProps = {
  filters: FichaFilters;
  result: FichaListResult;
};

const columns = [
  { key: "cliente", label: "Cliente" },
  { key: "entrega", label: "Entrega" },
  { key: "status", label: "Status" },
  { key: "personalizacao", label: "Personalização" },
  { key: "responsavel", label: "Responsável" },
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

export function RelatoriosOverview({ filters, result }: RelatoriosOverviewProps) {
  return (
    <section className="relatorios-view" aria-labelledby="relatorios-title">
      <header className="relatorios-view__header">
        <div className="page-heading">
          <div className="page-heading__copy">
            <p className="eyebrow">Relatórios</p>
            <h1 id="relatorios-title" className="app-title">
              Relatórios
            </h1>
          </div>
          <Link className="ui-button ui-button--primary" href={hrefForPdf(filters)}>
            <FileText aria-hidden="true" size={18} />
            Exportar PDF
          </Link>
        </div>
      </header>

      <form className="relatorios-toolbar" action="/relatorios">
        <div className="field">
          <label htmlFor="cliente">Cliente</label>
          <input id="cliente" name="cliente" defaultValue={filters.cliente} placeholder="Buscar por cliente…" />
        </div>
        <div className="field">
          <label htmlFor="arte">Personalização</label>
          <input id="arte" name="arte" defaultValue={filters.arte} placeholder="Sublimação, bordado…" />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="evento">Evento</label>
          <select id="evento" name="evento" defaultValue={typeof filters.evento === "boolean" ? String(filters.evento) : ""}>
            <option value="">Todos</option>
            <option value="true">Somente eventos</option>
            <option value="false">Sem evento</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="dataInicio">Entrega inicial</label>
          <input id="dataInicio" name="dataInicio" defaultValue={filters.dataInicio} type="date" />
        </div>
        <div className="field">
          <label htmlFor="dataFim">Entrega final</label>
          <input id="dataFim" name="dataFim" defaultValue={filters.dataFim} type="date" />
        </div>
        <Button type="submit">
          <Search aria-hidden="true" size={18} />
          Consultar
        </Button>
      </form>

      {renderRelatorioContent(result)}
    </section>
  );
}

function renderRelatorioContent(result: FichaListResult) {
  if (result.kind === "not-configured") {
    return (
      <EmptyState
        title="Relatórios indisponíveis"
        description="Tente novamente."
      />
    );
  }

  if (result.kind === "error") {
    return <EmptyState title="Não foi possível carregar o relatório" description={result.message} />;
  }

  if (result.fichas.length === 0) {
    return (
      <EmptyState
        actions={
          <Link className="ui-button ui-button--secondary" href="/relatorios">
            Limpar filtros
          </Link>
        }
        title="Nenhuma ficha encontrada"
        description="Ajuste os filtros."
      />
    );
  }

  const resumo = buildSummary(result.fichas);
  const grupos = groupByDate(result.fichas);

  return (
    <div className="relatorios-results">
      <div className="relatorios-summary" aria-label="Resumo do relatório">
        <SummaryCard label="Total filtrado" value={result.total} />
        <SummaryCard label="Pendentes" value={resumo.pendentes} tone="warning" />
        <SummaryCard label="Entregues" value={resumo.entregues} tone="success" />
        <SummaryCard label="Eventos" value={resumo.eventos} tone="info" />
      </div>

      {grupos.map((grupo) => (
        <section className="relatorios-group" key={grupo.id} aria-labelledby={`${grupo.id}-title`}>
          <header className="relatorios-group__header">
            <div>
              <h2 id={`${grupo.id}-title`}>{grupo.label}</h2>
              <p>
                {formatNumber(grupo.fichas.length)} {grupo.fichas.length === 1 ? "ficha" : "fichas"}
              </p>
            </div>
          </header>
          <DataTable caption={`Relatório de fichas com entrega em ${grupo.label}`} columns={columns}>
            {grupo.fichas.map((ficha) => (
              <RelatorioRow ficha={ficha} key={ficha.id} />
            ))}
          </DataTable>
        </section>
      ))}
    </div>
  );
}

function SummaryCard({ label, tone = "info", value }: { label: string; tone?: "info" | "success" | "warning"; value: number }) {
  const colorMap = {
    info: "var(--color-info)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
  };

  return (
    <div className={`relatorios-summary__card relatorios-summary__card--${tone}`}>
      <span>{label}</span>
      <strong style={{ color: colorMap[tone] }}>{formatNumber(value)}</strong>
    </div>
  );
}

function RelatorioRow({ ficha }: { ficha: FichaListItem }) {
  return (
    <tr>
      <td>
        <span className="ui-table__primary">
          <Link className="ui-table__link" href={`/fichas/${ficha.id}`}>
            {ficha.cliente_nome_snapshot}
          </Link>
          <span className="ui-table__muted">{ficha.numero_venda ? `Venda ${ficha.numero_venda}` : "—"}</span>
        </span>
      </td>
      <td>{formatDate(ficha.data_entrega)}</td>
      <td>
        <div className="ficha-status-line">
          <Badge tone={statusTones[ficha.status]}>{statusLabels[ficha.status]}</Badge>
          {ficha.evento ? <Badge tone="info">Evento</Badge> : null}
        </div>
      </td>
      <td>{normalizePersonalizacaoLabel(ficha.arte)}</td>
      <td>{ficha.vendedor ?? <span className="ui-table__muted">—</span>}</td>
    </tr>
  );
}

function buildSummary(fichas: FichaListItem[]) {
  return fichas.reduce(
    (summary, ficha) => ({
      entregues: summary.entregues + (ficha.status === "entregue" ? 1 : 0),
      eventos: summary.eventos + (ficha.evento ? 1 : 0),
      pendentes: summary.pendentes + (ficha.status === "pendente" ? 1 : 0),
    }),
    {
      entregues: 0,
      eventos: 0,
      pendentes: 0,
    },
  );
}

function groupByDate(fichas: FichaListItem[]) {
  const groups = new Map<string, FichaListItem[]>();

  for (const ficha of fichas) {
    const label = formatDate(ficha.data_entrega);
    groups.set(label, [...(groups.get(label) ?? []), ficha]);
  }

  return Array.from(groups.entries()).map(([label, fichasGrupo]) => ({
    fichas: fichasGrupo,
    id: `entrega-${slugify(label)}`,
    label,
  }));
}

function hrefForPdf(filters: FichaFilters) {
  const params = new URLSearchParams();

  if (filters.cliente) params.set("cliente", filters.cliente);
  if (filters.arte) params.set("arte", filters.arte);
  if (typeof filters.evento === "boolean") params.set("evento", String(filters.evento));
  if (filters.status) params.set("status", filters.status);
  if (filters.dataInicio) params.set("dataInicio", filters.dataInicio);
  if (filters.dataFim) params.set("dataFim", filters.dataFim);

  const query = params.toString();
  return query ? `/fichas/pdf?${query}` : "/fichas/pdf";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
