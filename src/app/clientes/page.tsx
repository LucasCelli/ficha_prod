import type { Metadata } from "next";
import { Modal } from "@/components/ui";
import { ClienteForm } from "@/features/clientes/cliente-form";
import { ClientesOverview } from "@/features/clientes/clientes-overview";
import { getClienteById, listClientes, normalizeClientePage, normalizeClienteSearch } from "@/features/clientes/data";

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
  };
  const editId = Array.isArray(params?.edit) ? params?.edit[0] : params?.edit;
  const modalMode = Array.isArray(params?.modal) ? params?.modal[0] : params?.modal;
  const closeHref = buildClientesCloseHref(filters);
  const [result, editResult] = await Promise.all([listClientes(filters), editId ? getClienteById(editId) : Promise.resolve(null)]);

  return (
    <>
      <ClientesOverview filters={filters} result={result} />
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

function buildClientesCloseHref(filters: { page?: number; termo?: string }) {
  const params = new URLSearchParams();
  if (filters.termo) params.set("termo", filters.termo);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/clientes?${query}` : "/clientes";
}
