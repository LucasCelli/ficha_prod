import type { NextRequest } from "next/server";
import {
  listFichasForOperationalPdf,
  normalizeBooleanFilter,
  normalizeDateFilter,
  normalizeFichaStatus,
  normalizeTextFilter,
} from "@/features/fichas/data";
import { generateOperationalFichasPdf } from "@/features/fichas/operational-pdf";

export async function GET(request: NextRequest) {
  const filters = {
    busca:
      normalizeTextFilter(request.nextUrl.searchParams.get("busca") ?? undefined) ??
      normalizeTextFilter(request.nextUrl.searchParams.get("cliente") ?? undefined) ??
      normalizeTextFilter(request.nextUrl.searchParams.get("arte") ?? undefined),
    dataFim: normalizeDateFilter(request.nextUrl.searchParams.get("dataFim") ?? undefined),
    dataInicio: normalizeDateFilter(request.nextUrl.searchParams.get("dataInicio") ?? undefined),
    evento: normalizeBooleanFilter(request.nextUrl.searchParams.get("evento") ?? undefined),
    id: normalizeTextFilter(request.nextUrl.searchParams.get("id") ?? undefined),
    status: normalizeFichaStatus(request.nextUrl.searchParams.get("status") ?? undefined),
  };
  const result = await listFichasForOperationalPdf(filters);
  const pdf = generateOperationalFichasPdf(result, filters);

  return new Response(pdf, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${buildFileName(filters.dataInicio, filters.dataFim)}"`,
      "Content-Type": "application/pdf",
    },
  });
}

function buildFileName(dataInicio?: string, dataFim?: string) {
  const range = [dataInicio, dataFim].filter(Boolean).join("_a_");
  return range ? `fichas-operacional-${range}.pdf` : "fichas-operacional.pdf";
}
