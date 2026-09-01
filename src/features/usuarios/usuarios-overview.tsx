import Link from "next/link";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { Badge, DataTable, EmptyState, Modal } from "@/components/ui";
import { RouteToast, type RouteToastMessage } from "@/components/ui/route-toast";
import { formatBusinessDateTime } from "@/lib/dates";
import { appUserRoleLabels } from "@/features/auth/types";
import type { UsuariosResult } from "./data";
import { UsuarioForm } from "./usuario-form";

type UsuariosOverviewProps = {
  editId?: string;
  modalMode?: string;
  result: UsuariosResult;
};

const columns = [
  { key: "user", label: "Usuário" },
  { key: "status", label: "Status" },
  { key: "role", label: "Função" },
  { key: "access", label: "Acesso" },
  { key: "actions", label: "Ações" },
];

function formatDate(value: string | null) {
  if (!value) return <em className="ui-table__muted">Nunca acessou</em>;
  return formatBusinessDateTime(new Date(value));
}

export function UsuariosOverview({ editId, modalMode, result }: UsuariosOverviewProps) {
  const selectedUsuario = result.usuarios.find((usuario) => usuario.id === editId);
  const activeCount = result.usuarios.filter((usuario) => usuario.active).length;

  return (
    <section className="usuarios-view" aria-labelledby="usuarios-title">
      <RouteToast messages={usuarioToastMessages} paramName="toast" />
      <header className="usuarios-view__header">
        <div>
          <h1 id="usuarios-title" className="app-title">
            Usuários
          </h1>
        </div>
        <div className="usuarios-summary" aria-label="Resumo de usuários">
          <span>
            <ShieldCheck aria-hidden="true" size={18} />
            {activeCount} ativos
          </span>
          <span>
            <KeyRound aria-hidden="true" size={18} />
            {result.usuarios.length} cadastrados
          </span>
          <Link className="ui-button ui-button--secondary" href="/usuarios/perfis">
            Gestão de autoria
          </Link>
          <Link className="ui-button ui-button--primary" href="/usuarios?modal=novo">
            <UserPlus aria-hidden="true" size={18} />
            Novo usuário
          </Link>
        </div>
      </header>

      {result.kind === "not-configured" ? (
        <EmptyState
          actions={<Link className="ui-button ui-button--secondary" href="/">Voltar ao início</Link>}
          description="Tente novamente."
          title="Usuários indisponíveis"
        />
      ) : null}

      {result.kind === "error" ? <EmptyState description={result.message} title="Não foi possível carregar usuários" /> : null}

      {result.kind === "ok" ? (
        <section className="usuarios-panel" aria-labelledby="usuarios-list-title">
          <div className="usuarios-panel__title usuarios-panel__title--spread">
            <div>
              <ShieldCheck aria-hidden="true" size={18} />
              <h2 id="usuarios-list-title">Usuários cadastrados</h2>
            </div>
            <Badge>{result.usuarios.length}</Badge>
          </div>
          {result.usuarios.length ? (
            <DataTable caption="Usuários cadastrados" columns={columns}>
              {result.usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>
                    <span className="ui-table__primary">
                      <strong>{usuario.display_name}</strong>
                      <span className="ui-table__muted">{usuario.username}</span>
                    </span>
                  </td>
                  <td>
                    <Badge tone={usuario.active ? "success" : "neutral"}>{usuario.active ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td><Badge tone={usuario.role === "superadmin" ? "info" : "neutral"}>{appUserRoleLabels[usuario.role]}</Badge></td>
                  <td>{formatDate(usuario.last_login_at)}</td>
                  <td>
                    <Link className="ui-button ui-button--secondary" href={`/usuarios?edit=${usuario.id}`}>
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState description="Sem registros." title="Nenhum usuário" />
          )}

          {modalMode === "novo" ? (
            <Modal onCloseHref="/usuarios" size="md" title="Novo usuário">
              <div className="modal-form">
                <div className="modal-form__header">
                  <h2>Cadastrar usuário</h2>
                </div>
                <UsuarioForm returnTo="/usuarios" />
              </div>
            </Modal>
          ) : null}

          {selectedUsuario ? (
            <Modal onCloseHref="/usuarios" size="md" title={`Editar ${selectedUsuario.display_name}`}>
              <div className="modal-form">
                <div className="modal-form__header">
                  <h2>Editar usuário</h2>
                </div>
                <UsuarioForm usuario={selectedUsuario} returnTo="/usuarios" />
              </div>
            </Modal>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

const usuarioToastMessages: Record<string, RouteToastMessage> = {
  "usuario-created": {
    description: "O usuário foi cadastrado.",
    title: "Usuário salvo",
    tone: "success",
  },
  "usuario-updated": {
    description: "As alterações foram salvas.",
    title: "Usuário atualizado",
    tone: "success",
  },
};
