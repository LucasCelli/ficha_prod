import type { Metadata } from "next";
import { loadQuadroProducaoSearchParams } from "@/features/quadro-producao/search-params";
import { getQuadroProducaoSnapshot } from "@/features/quadro-producao/data";
import { QuadroProducaoClient } from "@/features/quadro-producao/quadro-producao-client";
import { requireAppSession } from "@/features/auth/session";
import { listCatalogOptionsForFichaForm } from "@/features/catalogos/data";

export const metadata: Metadata = {
  title: "Quadro de Produção | Fichas Técnicas",
};

type QuadroProducaoPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuadroProducaoPage({ searchParams }: QuadroProducaoPageProps) {
  await requireAppSession();
  const filters = await loadQuadroProducaoSearchParams((await searchParams) ?? {});
  const [result, catalogOptions] = await Promise.all([
    getQuadroProducaoSnapshot(filters),
    listCatalogOptionsForFichaForm(),
  ]);

  return <QuadroProducaoClient catalogFabricOptions={catalogOptions.tecido} initialFilters={filters} initialResult={result} />;
}
