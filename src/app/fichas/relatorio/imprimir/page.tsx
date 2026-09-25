import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { requireAppSession } from "@/features/auth/session";
import {
  listFichasForOperationalPdf,
  normalizeBooleanFilter,
  normalizeDateFilter,
  normalizeFichaStatus,
  normalizeTextFilter,
} from "@/features/fichas/data";
import { OperationalReport, resolveWeeklyReportMode } from "@/features/fichas/operational-report";
import { getPrintPeriodError } from "@/features/fichas/print-period";
import { PrintOnLoad } from "@/features/fichas/print-on-load";

export const metadata: Metadata = {
  title: "Imprimir relatório | Fichas Técnicas",
};

type PrintReportPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrintReportPage({ searchParams }: PrintReportPageProps) {
  await requireAppSession();
  const query = await searchParams;
  const filters = {
    arte: normalizeTextFilter(query.arte),
    busca: normalizeTextFilter(query.busca),
    dataFim: normalizeDateFilter(query.dataFim),
    dataInicio: normalizeDateFilter(query.dataInicio),
    evento: normalizeBooleanFilter(query.evento),
    status: normalizeFichaStatus(query.status),
  };
  const periodError = getPrintPeriodError(filters.dataInicio, filters.dataFim);

  if (periodError) {
    return renderError(periodError);
  }

  const weeklyMode = resolveWeeklyReportMode(filters);
  const includeOverdue = normalizeBooleanFilter(query.incluirAtrasadas) === true;
  const [result, overdueResult] = await Promise.all([
    listFichasForOperationalPdf(filters),
    includeOverdue
      ? listFichasForOperationalPdf({ ...filters, dataFim: undefined, dataInicio: undefined, status: "atrasado" })
      : undefined,
  ]);

  if (result.kind !== "ok") {
    return renderError(result.kind === "error" ? result.message : "Relatório indisponível.");
  }

  const overdueFichas = overdueResult?.kind === "ok" ? overdueResult.fichas : [];
  const knownIds = new Set(overdueFichas.map((ficha) => ficha.id));
  const fichas = [...overdueFichas, ...result.fichas.filter((ficha) => !knownIds.has(ficha.id))];

  return (
    <>
      <PrintOnLoad />
      <OperationalReport fichas={fichas} filters={filters} weeklyMode={weeklyMode} />
    </>
  );
}

function renderError(message: string) {
  return (
    <EmptyState
      actions={
        <Link className="ui-button ui-button--secondary" href="/fichas">
          Voltar para fichas
        </Link>
      }
      description={message}
      title="Não foi possível imprimir"
    />
  );
}
