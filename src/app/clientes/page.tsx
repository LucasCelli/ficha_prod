import type { Metadata } from "next";
import { ClientesOverview } from "@/features/clientes/clientes-overview";
import { listClientes, normalizeClientePage, normalizeClienteSearch } from "@/features/clientes/data";

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
  const result = await listClientes(filters);

  return <ClientesOverview filters={filters} result={result} />;
}
