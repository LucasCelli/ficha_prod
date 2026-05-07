import Link from "next/link";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { Badge, DataTable, EmptyState, Modal } from "@/components/ui";
import type { UsuariosResult } from "./data";
import { UsuarioForm } from "./usuario-form";

type UsuariosOverviewProps = {
  editId?: string;
  modalMode?: string;
  result: UsuariosResult;
};

const columns = [
  { key: "operator", label: "Operador" },
  { key: "status", label: "Status" },
  { key: "access", label: "Acesso" },
  { key: "actions", label: "Ações" },
];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  if (!value) return "Nunca acessou";
  return dateFormatter.format(new Date(value));
}

export function UsuariosOverview({ editId, modalMode, result }: UsuariosOverviewProps) {
  const selectedOperador = result.operadores.find((operador) => operador.id === editId);
  const activeCount = result.operadores.filter((operador) => operador.active).length;

  return (
    <section className="usuarios-view" aria-labelledby="usuarios-title">
      <header className="usuarios-view__header">
        <div>
          <span className="eyebrow">Usuários</span>
          <h1 id="usuarios-title" className="app-title">
            Operadores
          </h1>
        </div>
        <div className="usuarios-summary" aria-label="Resumo de operadores">
          <span>
            <ShieldCheck aria-hidden="true" size={18} />
            {activeCount} ativos
          </span>
          <span>
            <KeyRound aria-hidden="true" size={18} />
            {result.operadores.length} cadastrados
          </span>
          <Link className="ui-button ui-button--primary" href="/usuarios?modal=novo">
            <UserPlus aria-hidden="true" size={18} />
            Novo operador
          </Link>
        </div>
      </header>

      {result.kind === "not-configured" ? (
        <EmptyState
          actions={<Link className="ui-button ui-button--secondary" href="/">Voltar ao início</Link>}
          description="Tente novamente."
          title="Operadores indisponíveis"
        />
      ) : null}

      {result.kind === "error" ? <EmptyState description={result.message} title="Não foi possível carregar operadores" /> : null}

      {result.kind === "ok" ? (
        <section className="usuarios-panel" aria-labelledby="usuarios-list-title">
          <div className="usuarios-panel__title usuarios-panel__title--spread">
            <div>
              <ShieldCheck aria-hidden="true" size={18} />
              <h2 id="usuarios-list-title">Operadores cadastrados</h2>
            </div>
            <Badge>{result.operadores.length}</Badge>
          </div>
          {result.operadores.length ? (
            <DataTable caption="Operadores cadastrados" columns={columns}>
              {result.operadores.map((operador) => (
                <tr key={operador.id}>
                  <td>
                    <span className="ui-table__primary">
                      <strong>{operador.display_name}</strong>
                      <span className="ui-table__muted">{operador.username}</span>
                    </span>
                  </td>
                  <td>
                    <Badge tone={operador.active ? "success" : "warning"}>{operador.active ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td>{formatDate(operador.last_login_at)}</td>
                  <td>
                    <Link className="ui-button ui-button--secondary" href={`/usuarios?edit=${operador.id}`}>
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState description="Sem registros." title="Nenhum operador" />
          )}

          {modalMode === "novo" ? (
            <Modal onCloseHref="/usuarios" size="md" title="Novo operador">
              <div className="modal-form">
                <div className="modal-form__header">
                  <span className="eyebrow">Usuários</span>
                  <h2>Cadastrar operador</h2>
                </div>
                <UsuarioForm returnTo="/usuarios" />
              </div>
            </Modal>
          ) : null}

          {selectedOperador ? (
            <Modal onCloseHref="/usuarios" size="md" title={`Editar ${selectedOperador.display_name}`}>
              <div className="modal-form">
                <div className="modal-form__header">
                  <span className="eyebrow">Usuários</span>
                  <h2>Editar operador</h2>
                </div>
                <UsuarioForm operador={selectedOperador} returnTo="/usuarios" />
              </div>
            </Modal>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
