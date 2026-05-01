import Link from "next/link";
import { Badge, DataTable, EmptyState } from "@/components/ui";
import type { FichaListItem, FichaStatus } from "@/features/fichas/data";
import type { ClienteDetailResult } from "./data";

type ClienteDetailProps = {
  result: ClienteDetailResult;
};

const columns = [
  { key: "entrega", label: "Entrega" },
  { key: "status", label: "Status" },
  { key: "personalizacao", label: "Personalização" },
  { key: "venda", label: "Venda" },
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

export function ClienteDetail({ result }: ClienteDetailProps) {
  if (result.kind === "not-configured") {
    return (
      <EmptyState
        title="Supabase ainda não configurado"
        description="O detalhe do cliente já está preparado para consultar cadastro e histórico de fichas assim que as variáveis de ambiente estiverem disponíveis."
      />
    );
  }

  if (result.kind === "not-found") {
    return (
      <EmptyState
        actions={
          <Link className="ui-button ui-button--secondary" href="/clientes">
            Voltar para clientes
          </Link>
        }
        title="Cliente não encontrado"
        description="O cliente solicitado não existe na tabela nova ou ainda não foi importado."
      />
    );
  }

  if (result.kind === "error") {
    return <EmptyState title="Não foi possível carregar o cliente" description={`A consulta ao Supabase falhou: ${result.message}`} />;
  }

  const { cliente } = result;

  return (
    <section className="cliente-detail" aria-labelledby="cliente-title">
      <header className="cliente-detail__header">
        <div className="page-heading">
          <div className="page-heading__copy">
            <Badge tone="info">Cliente</Badge>
            <h1 id="cliente-title" className="app-title">
              {cliente.nome}
            </h1>
            <p className="app-summary">
              Cadastro e histórico recente de fichas vinculadas ao cliente no novo modelo Supabase.
            </p>
          </div>
          <Link className="ui-button ui-button--secondary" href={`/fichas?cliente=${encodeURIComponent(cliente.nome)}`}>
            Ver fichas
          </Link>
          <Link className="ui-button ui-button--primary" href={`/clientes/${cliente.id}/editar`}>
            Editar cliente
          </Link>
        </div>
      </header>

      <dl className="cliente-detail__summary">
        <div>
          <dt>Total de fichas</dt>
          <dd>{formatNumber(cliente.total_fichas)}</dd>
        </div>
        <div>
          <dt>Primeira ficha</dt>
          <dd>{formatDate(cliente.primeira_ficha)}</dd>
        </div>
        <div>
          <dt>Última ficha</dt>
          <dd>{formatDate(cliente.ultima_ficha)}</dd>
        </div>
        <div>
          <dt>Contato</dt>
          <dd>{formatContact(cliente.telefone, cliente.email)}</dd>
        </div>
      </dl>

      <section className="cliente-detail__history" aria-labelledby="cliente-history-title">
        <div className="section-heading">
          <h2 id="cliente-history-title">Histórico recente</h2>
          <p>Últimas fichas vinculadas diretamente ao cadastro do cliente.</p>
        </div>
        {cliente.fichas.length ? (
          <DataTable caption={`Histórico de fichas de ${cliente.nome}`} columns={columns}>
            {cliente.fichas.map((ficha) => (
              <FichaHistoryRow ficha={ficha} key={ficha.id} />
            ))}
          </DataTable>
        ) : (
          <EmptyState
            actions={
              <Link className="ui-button ui-button--secondary" href={`/fichas?cliente=${encodeURIComponent(cliente.nome)}`}>
                Buscar por nome nas fichas
              </Link>
            }
            title="Nenhuma ficha vinculada"
            description="O cliente existe, mas ainda não há fichas relacionadas pelo `cliente_id`. A busca por nome ajuda a localizar registros importados antes da vinculação final."
          />
        )}
      </section>
    </section>
  );
}

function FichaHistoryRow({ ficha }: { ficha: FichaListItem }) {
  return (
    <tr>
      <td>{formatDate(ficha.data_entrega)}</td>
      <td>
        <div className="ficha-status-line">
          <Badge tone={statusTones[ficha.status]}>{statusLabels[ficha.status]}</Badge>
          {ficha.evento ? <Badge tone="info">Evento</Badge> : null}
        </div>
      </td>
      <td>
        <span className="ui-table__primary">
          <Link className="ui-table__link" href={`/fichas/${ficha.id}`}>
            {formatPersonalizacao(ficha.arte)}
          </Link>
          <span className="ui-table__muted">{ficha.kanban_status.replaceAll("_", " ")}</span>
        </span>
      </td>
      <td>{ficha.numero_venda ?? "Sem venda"}</td>
      <td>{ficha.vendedor ?? "Sem vendedor"}</td>
    </tr>
  );
}

function formatContact(telefone: string | null, email: string | null) {
  const parts = [telefone, email].filter(Boolean);
  return parts.length ? parts.join(" | ") : "Sem contato";
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

function formatPersonalizacao(value: string | null) {
  return value?.replaceAll("_", " ").trim() || "Sem tipo definido";
}
