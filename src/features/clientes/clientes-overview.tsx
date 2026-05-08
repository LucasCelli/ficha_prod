import Link from "next/link";
import { Plus } from "lucide-react";
import { DataTable, EmptyState, Pagination } from "@/components/ui";
import { CLIENTES_PAGE_SIZE, type ClienteFilters, type ClienteListItem, type ClientesListResult } from "./data";
import { ClienteDeleteAction } from "./cliente-delete-action";
import { ClientesSearchToolbar } from "./clientes-search-toolbar";

type ClientesOverviewProps = {
  filters: ClienteFilters;
  result: ClientesListResult;
};

const columns = [
  { key: "cliente", label: "Cliente" },
  { key: "contato", label: "Contato" },
  { key: "primeira", label: "Primeira ficha" },
  { key: "ultima", label: "Última ficha" },
  { key: "total", label: "Total" },
  { key: "acoes", label: "Ações" },
];

export function ClientesOverview({ filters, result }: ClientesOverviewProps) {
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

      <ClientesSearchToolbar initialTerm={filters.termo} />

      {renderClientesContent(result, filters)}
    </section>
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
            Limpar busca
          </Link>
        }
        title="Nenhum cliente encontrado"
        description="Ajuste a busca."
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
        params={{ termo: filters.termo }}
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
        </span>
      </td>
      <td>
        <span className="ui-table__primary">
          <span>{cliente.telefone ?? <span className="ui-table__muted">—</span>}</span>
          <span className="ui-table__muted">{cliente.email ?? "—"}</span>
        </span>
      </td>
      <td>{formatDate(cliente.primeira_ficha)}</td>
      <td>{formatDate(cliente.ultima_ficha)}</td>
      <td>{formatNumber(cliente.total_fichas)}</td>
      <td>
        <ClienteDeleteAction
          clienteId={cliente.id}
          clienteNome={cliente.nome}
          editHref={buildClientesHref(filters, { edit: cliente.id })}
          returnTo={returnTo}
          viewFichasHref={`/fichas?cliente=${encodeURIComponent(cliente.nome)}`}
        />
      </td>
    </tr>
  );
}

export function buildClientesHref(filters: ClienteFilters, extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();

  if (filters.termo) params.set("termo", filters.termo);
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
