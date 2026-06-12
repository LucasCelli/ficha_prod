import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, FileText, Pencil, Plus, UserPlus, Users, UserX } from "lucide-react";
import { DataTable, EmptyState, Pagination } from "@/components/ui";
import { formatCompactDateInput } from "@/lib/dates";
import {
  CLIENTES_PAGE_SIZE,
  type ClienteFilters,
  type ClienteListItem,
  type ClientesListResult,
  type ClientesStats as ClientesStatsData,
  type ClientesStatsResult,
} from "./data";
import { ClienteDeleteAction } from "./cliente-delete-action";
import { ClientesSearchToolbar } from "./clientes-search-toolbar";

type ClientesOverviewProps = {
  filters: ClienteFilters;
  result: ClientesListResult;
  statsResult: ClientesStatsResult;
};

const columns = [
  { key: "cliente", label: "Cliente" },
  { key: "primeira", label: "Primeira ficha", width: "150px" },
  { key: "ultima", label: "Última ficha", width: "150px" },
  { key: "total", label: "Total de fichas", width: "130px", align: "left" as const },
  { key: "acoes", label: "Ações", width: "300px" },
];

export function ClientesOverview({ filters, result, statsResult }: ClientesOverviewProps) {
  return (
    <section className="clientes-view" aria-labelledby="clientes-title">
      <header className="clientes-view__header">
        <div className="page-heading">
          <div className="page-heading__copy">
            <p className="eyebrow">Clientes</p>
            <h1 id="clientes-title" className="app-title">
              Clientes
            </h1>
          </div>
          <Link className="ui-button ui-button--primary" href={buildClientesHref(filters, { modal: "novo" })}>
            <Plus aria-hidden="true" size={18} />
            Novo cliente
          </Link>
        </div>
      </header>

      {statsResult.kind === "ok" ? <ClientesStats stats={statsResult.stats} /> : null}

      <ClientesSearchToolbar filters={filters} />

      {renderClientesContent(result, filters)}
    </section>
  );
}

function ClientesStats({ stats }: { stats: ClientesStatsData }) {
  return (
    <div className="clientes-kpis" aria-label="Resumo da base de clientes">
      <StatCard icon={<Users aria-hidden="true" size={18} />} label="Total de clientes" value={formatNumber(stats.total)} hint="cadastrados na base" />
      <StatCard
        icon={<Activity aria-hidden="true" size={18} />}
        label="Clientes ativos"
        value={formatNumber(stats.ativos)}
        hint="com ficha nos últimos 90 dias"
        tone="success"
      />
      <StatCard
        icon={<UserPlus aria-hidden="true" size={18} />}
        label="Novos este mês"
        value={formatNumber(stats.novosMes)}
        hint="cadastrados no mês atual"
        tone="primary"
      />
      <StatCard
        icon={<UserX aria-hidden="true" size={18} />}
        label="Sem fichas"
        value={formatNumber(stats.semFichas)}
        hint="ainda sem pedidos vinculados"
        tone="muted"
      />
    </div>
  );
}

function StatCard({
  hint,
  icon,
  label,
  tone = "neutral",
  value,
}: {
  hint?: string;
  icon: ReactNode;
  label: string;
  tone?: "neutral" | "primary" | "success" | "muted";
  value: string;
}) {
  return (
    <div className={`clientes-kpi clientes-kpi--${tone}`}>
      <span className="clientes-kpi__icon">{icon}</span>
      <div className="clientes-kpi__body">
        <span className="clientes-kpi__label">{label}</span>
        <strong className="clientes-kpi__value">{value}</strong>
        {hint ? <span className="clientes-kpi__hint">{hint}</span> : null}
      </div>
    </div>
  );
}

function renderClientesContent(result: ClientesListResult, filters: ClienteFilters) {
  if (result.kind === "not-configured") {
    return (
      <EmptyState
        title="Clientes indisponíveis"
        description="Tente novamente."
      />
    );
  }

  if (result.kind === "error") {
    return (
      <EmptyState
        title="Não foi possível carregar clientes"
        description={result.message}
      />
    );
  }

  if (result.clientes.length === 0) {
    return (
      <EmptyState
        actions={
          <Link className="ui-button ui-button--secondary" href="/clientes">
            Limpar filtros
          </Link>
        }
        title="Nenhum cliente encontrado"
        description="Ajuste a busca ou os filtros."
      />
    );
  }

  return (
    <div className="clientes-results">
      <p className="results-summary" aria-label="Resumo de clientes">
        Mostrando <strong style={{ color: "var(--color-text)" }}>{formatNumber(result.clientes.length)}</strong> de <strong style={{ color: "var(--color-text)" }}>{formatNumber(result.total)}</strong> registros
      </p>
      <DataTable caption={`Lista de clientes com ${result.total} registros encontrados`} columns={columns}>
        {result.clientes.map((cliente) => (
          <ClienteRow cliente={cliente} filters={filters} key={cliente.id} />
        ))}
      </DataTable>
      <Pagination
        basePath="/clientes"
        currentPage={filters.page ?? 1}
        pageSize={CLIENTES_PAGE_SIZE}
        params={{ termo: filters.termo, sort: filters.sort, atividade: filters.atividade }}
        totalItems={result.total}
      />
    </div>
  );
}

function ClienteRow({ cliente, filters }: { cliente: ClienteListItem; filters: ClienteFilters }) {
  const returnTo = buildClientesHref(filters);

  return (
    <tr>
      <td>
        <span className="ui-table__primary">
          <Link className="ui-table__link" href={`/clientes/${cliente.id}`}>
            {cliente.nome}
          </Link>
          {cliente.telefone || cliente.email ? (
            <span className="ui-table__muted">{[cliente.telefone, cliente.email].filter(Boolean).join(" · ")}</span>
          ) : null}
        </span>
      </td>
      <td>{formatDate(cliente.primeira_ficha)}</td>
      <td>{formatDate(cliente.ultima_ficha)}</td>
      <td>{formatNumber(cliente.total_fichas)}</td>
      <td>
        <div className="cliente-row-actions">
          <Link
            className="ui-button ui-button--secondary ui-button--sm"
            href={`/fichas?cliente=${encodeURIComponent(cliente.nome)}`}
          >
            <FileText aria-hidden="true" size={15} />
            Ver fichas
          </Link>
          <Link className="ui-button ui-button--ghost ui-button--sm" href={buildClientesHref(filters, { edit: cliente.id })}>
            <Pencil aria-hidden="true" size={15} />
            Editar
          </Link>
          <ClienteDeleteAction
            clienteId={cliente.id}
            clienteNome={cliente.nome}
            returnTo={returnTo}
            variant="icon"
          />
        </div>
      </td>
    </tr>
  );
}

export function buildClientesHref(filters: ClienteFilters, extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();

  if (filters.termo) params.set("termo", filters.termo);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.atividade) params.set("atividade", filters.atividade);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));

  Object.entries(extra).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });

  const query = params.toString();
  return query ? `/clientes?${query}` : "/clientes";
}

function formatDate(value: string | null) {
  if (!value) return <span className="ui-table__muted">—</span>;
  return formatCompactDateInput(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
