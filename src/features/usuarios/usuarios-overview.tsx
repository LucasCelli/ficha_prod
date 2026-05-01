import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { Badge, DataTable, EmptyState } from "@/components/ui";
import type { UsuariosResult } from "./data";
import { UsuarioForm } from "./usuario-form";

type UsuariosOverviewProps = {
  editId?: string;
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

export function UsuariosOverview({ editId, result }: UsuariosOverviewProps) {
  const selectedOperador = result.operadores.find((operador) => operador.id === editId);
  const activeCount = result.operadores.filter((operador) => operador.active).length;
  const isEditing = Boolean(selectedOperador);

  return (
    <section className="usuarios-view" aria-labelledby="usuarios-title">
      <header className="usuarios-view__header">
        <div>
          <span className="eyebrow">Usuários</span>
          <h1 id="usuarios-title" className="app-title">
            {selectedOperador ? `Editando ${selectedOperador.display_name}` : "Operadores da aplicação"}
          </h1>
          <p>
            {selectedOperador
              ? "Altere dados, status ou PIN deste operador. A listagem fica fora desta tela para evitar confusão."
              : "Cadastre acessos operacionais por usuário e PIN, mantendo catálogos e gestão de usuários restritos ao superadmin."}
          </p>
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
        </div>
      </header>

      {result.kind === "not-configured" ? (
        <EmptyState
          actions={<Link className="ui-button ui-button--secondary" href="/">Voltar ao início</Link>}
          description="Configure as variáveis de ambiente do Supabase para administrar operadores."
          title="Supabase ainda não configurado"
        />
      ) : null}

      {result.kind === "error" ? <EmptyState description={result.message} title="Não foi possível carregar operadores" /> : null}

      {result.kind === "ok" ? (
        <div className={isEditing ? "usuarios-layout usuarios-layout--editing" : "usuarios-layout"}>
          <section className="usuarios-panel" aria-labelledby="usuarios-form-title">
            <div className="usuarios-panel__title">
              <UserPlus aria-hidden="true" size={18} />
              <h2 id="usuarios-form-title">{selectedOperador ? "Editar operador" : "Cadastrar operador"}</h2>
            </div>
            <UsuarioForm operador={selectedOperador} />
          </section>

          {selectedOperador ? (
            <Link className="ui-button ui-button--secondary usuarios-back-link" href="/usuarios">
              <ArrowLeft aria-hidden="true" size={18} />
              Voltar para lista de operadores
            </Link>
          ) : null}

          {!selectedOperador ? (
            <section className="usuarios-panel" aria-labelledby="usuarios-list-title">
              <div className="usuarios-panel__title">
                <ShieldCheck aria-hidden="true" size={18} />
                <h2 id="usuarios-list-title">Operadores cadastrados</h2>
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
                <EmptyState description="Cadastre o primeiro operador para liberar acesso restrito aos fluxos operacionais." title="Nenhum operador" />
              )}
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
