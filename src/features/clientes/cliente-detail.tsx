import Link from "next/link";
import { Badge, DataTable, EmptyState } from "@/components/ui";
import type { FichaListItem, FichaStatus } from "@/features/fichas/data";
import { formatDateInput } from "@/lib/dates";
import { ClienteDeleteAction } from "./cliente-delete-action";
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
        title="Cliente indisponível"
        description="Tente novamente."
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
        description="Verifique a busca."
      />
    );
  }

  if (result.kind === "error") {
    return <EmptyState title="Não foi possível carregar o cliente" description={result.message} />;
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
          </div>
          <ClienteDeleteAction
            clienteId={cliente.id}
            clienteNome={cliente.nome}
            editHref={`/clientes/${cliente.id}/editar`}
            returnTo="/clientes"
            variant="header"
            viewFichasHref={`/fichas?cliente=${encodeURIComponent(cliente.nome)}`}
          />
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
            description="Busque por nome."
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
          <span className="ui-table__muted">{ficha.kanban_column?.name ?? ficha.kanban_status.replaceAll("_", " ")}</span>
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
  return formatDateInput(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPersonalizacao(value: string | null) {
  return value?.replaceAll("_", " ").trim() || "Sem tipo definido";
}
