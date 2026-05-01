import type { Metadata } from "next";
import { RelatoriosLegadoOverview } from "@/features/relatorios/relatorios-legado-overview";
import {
  getRelatorioData,
  normalizeRelatorioDate,
  normalizeRelatorioEvento,
  normalizeRelatorioPeriodo,
  normalizeRelatorioStatus,
} from "@/features/relatorios/data";

export const metadata: Metadata = {
  title: "Relatórios | Fichas Técnicas",
};

type RelatoriosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RelatoriosPage({ searchParams }: RelatoriosPageProps) {
  const params = await searchParams;
  const filters = {
    dataFim: normalizeRelatorioDate(params.dataFim),
    dataInicio: normalizeRelatorioDate(params.dataInicio),
    evento: normalizeRelatorioEvento(params.evento),
    periodo: normalizeRelatorioPeriodo(params.periodo),
    status: normalizeRelatorioStatus(params.status),
  };
  const result = await getRelatorioData(filters);

  return <RelatoriosLegadoOverview filters={filters} result={result} />;
}
