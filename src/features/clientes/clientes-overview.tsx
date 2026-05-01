import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Badge, Button, DataTable, EmptyState, Pagination } from "@/components/ui";
import { CLIENTES_PAGE_SIZE, type ClienteFilters, type ClienteListItem, type ClientesListResult } from "./data";

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
            <Badge tone="info">Clientes</Badge>
            <h1 id="clientes-title" className="app-title">
              Clientes
            </h1>
            <p className="app-summary">
              Consulta nativa ligada ao Supabase, preparada para histórico de fichas, atendimento e migração dos dados do legado.
            </p>
          </div>
          <Link className="ui-button ui-button--primary" href="/clientes/novo">
            <Plus aria-hidden="true" size={18} />
            Novo cliente
          </Link>
        </div>
      </header>

      <form className="clientes-toolbar" action="/clientes">
        <div className="field">
          <label htmlFor="termo">Buscar cliente</label>
          <input id="termo" name="termo" defaultValue={filters.termo} placeholder="Nome do cliente…" />
        </div>
        <Button type="submit">
          <Search aria-hidden="true" size={18} />
          Buscar
        </Button>
      </form>

      {renderClientesContent(result, filters)}
    </section>
  );
}

function renderClientesContent(result: ClientesListResult, filters: ClienteFilters) {
  if (result.kind === "not-configured") {
    return (
      <EmptyState
        title="Supabase ainda não configurado"
        description="A tela de clientes já consulta a tabela nova. Configure as variáveis de ambiente do Supabase para carregar dados reais."
      />
    );
  }

  if (result.kind === "error") {
    return (
      <EmptyState
        title="Não foi possível carregar clientes"
        description={`A consulta ao Supabase falhou: ${result.message}`}
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
        description="Clientes criados pelas fichas ou importados do legado aparecerão aqui com datas e volume de fichas."
      />
    );
  }

  return (
    <div className="clientes-results">
      <div className="clientes-results__summary" aria-label="Resumo de clientes">
        <div>
          <span>Registros encontrados</span>
          <strong>{formatNumber(result.total)}</strong>
        </div>
        <div>
          <span>Total nesta página</span>
          <strong>{formatNumber(result.clientes.length)}</strong>
        </div>
      </div>
      <DataTable caption={`Lista de clientes com ${result.total} registros encontrados`} columns={columns}>
        {result.clientes.map((cliente) => (
          <ClienteRow cliente={cliente} key={cliente.id} />
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

function ClienteRow({ cliente }: { cliente: ClienteListItem }) {
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
          <span>{cliente.telefone ?? "Sem telefone"}</span>
          <span className="ui-table__muted">{cliente.email ?? "Sem e-mail"}</span>
        </span>
      </td>
      <td>{formatDate(cliente.primeira_ficha)}</td>
      <td>{formatDate(cliente.ultima_ficha)}</td>
      <td>{formatNumber(cliente.total_fichas)}</td>
      <td>
        <span className="ui-table__primary">
          <Link className="ui-table__link" href={`/fichas?cliente=${encodeURIComponent(cliente.nome)}`}>
            Ver fichas
          </Link>
          <Link className="ui-table__link" href={`/clientes/${cliente.id}/editar`}>
            Editar
          </Link>
        </span>
      </td>
    </tr>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Sem data";
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
