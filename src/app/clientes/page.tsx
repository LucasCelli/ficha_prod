import type { Metadata } from "next";
import { Modal } from "@/components/ui";
import { RouteToast, type RouteToastMessage } from "@/components/ui/route-toast";
import { ClienteForm } from "@/features/clientes/cliente-form";
import { ClientesOverview } from "@/features/clientes/clientes-overview";
import {
  getClienteById,
  getClientesStats,
  listClientes,
  normalizeClienteAtividade,
  normalizeClientePage,
  normalizeClienteSearch,
  normalizeClienteSort,
} from "@/features/clientes/data";

export const metadata: Metadata = {
  title: "Clientes | Fichas Técnicas",
};

type ClientesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const params = await searchParams;
  const filters = {
    page: normalizeClientePage(params?.page),
    termo: normalizeClienteSearch(params?.termo),
    sort: normalizeClienteSort(params?.sort),
    atividade: normalizeClienteAtividade(params?.atividade),
  };
  const editId = Array.isArray(params?.edit) ? params?.edit[0] : params?.edit;
  const modalMode = Array.isArray(params?.modal) ? params?.modal[0] : params?.modal;
  const closeHref = buildClientesCloseHref(filters);
  const [result, statsResult, editResult] = await Promise.all([
    listClientes(filters),
    getClientesStats(),
    editId ? getClienteById(editId) : Promise.resolve(null),
  ]);

  return (
    <>
      <RouteToast messages={clienteToastMessages} paramName="toast" />
      <ClientesOverview filters={filters} result={result} statsResult={statsResult} />
      {modalMode === "novo" ? (
        <Modal onCloseHref={closeHref} size="md" title="Novo cliente">
          <div className="modal-form">
            <div className="modal-form__header">
              <span className="eyebrow">Clientes</span>
              <h2>Novo cliente</h2>
            </div>
            <ClienteForm returnTo={closeHref} />
          </div>
        </Modal>
      ) : null}
      {editId && editResult?.kind === "ok" ? (
        <Modal onCloseHref={closeHref} size="md" title={`Editar ${editResult.cliente.nome}`}>
          <div className="modal-form">
            <div className="modal-form__header">
              <span className="eyebrow">Clientes</span>
              <h2>Editar cliente</h2>
            </div>
            <ClienteForm cliente={editResult.cliente} mode="edit" returnTo={closeHref} />
          </div>
        </Modal>
      ) : null}
    </>
  );
}

const clienteToastMessages: Record<string, RouteToastMessage> = {
  "cliente-created": {
    description: "O cliente foi cadastrado.",
    title: "Cliente salvo",
    tone: "success",
  },
  "cliente-updated": {
    description: "As alterações foram salvas.",
    title: "Cliente atualizado",
    tone: "success",
  },
  "cliente-deleted": {
    description: "O cliente foi excluido.",
    title: "Cliente excluido",
    tone: "success",
  },
};

function buildClientesCloseHref(filters: { page?: number; termo?: string; sort?: string; atividade?: string }) {
  const params = new URLSearchParams();
  if (filters.termo) params.set("termo", filters.termo);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.atividade) params.set("atividade", filters.atividade);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/clientes?${query}` : "/clientes";
}
