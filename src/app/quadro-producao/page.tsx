import type { Metadata } from "next";
import { loadQuadroProducaoSearchParams } from "@/features/quadro-producao/search-params";
import { getQuadroProducaoSnapshot } from "@/features/quadro-producao/data";
import { QuadroProducaoClient } from "@/features/quadro-producao/quadro-producao-client";

export const metadata: Metadata = {
  title: "Quadro de Produção | Fichas Técnicas",
};

type QuadroProducaoPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuadroProducaoPage({ searchParams }: QuadroProducaoPageProps) {
  const filters = await loadQuadroProducaoSearchParams((await searchParams) ?? {});
  const result = await getQuadroProducaoSnapshot(filters);

  return <QuadroProducaoClient initialFilters={filters} initialResult={result} />;
}
