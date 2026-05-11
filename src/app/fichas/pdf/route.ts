import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/features/auth/session";
import {
  listFichasForOperationalPdf,
  normalizeBooleanFilter,
  normalizeDateFilter,
  normalizeFichaStatus,
  normalizePageFilter,
  normalizeTextFilter,
} from "@/features/fichas/data";
import { generateOperationalFichasPdf } from "@/features/fichas/operational-pdf";
import { getBusinessWeekRange } from "@/lib/dates";

type WeeklyPdfMode = "current-week" | "next-week";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const filters = {
    busca:
      normalizeTextFilter(request.nextUrl.searchParams.get("busca") ?? undefined) ??
      normalizeTextFilter(request.nextUrl.searchParams.get("cliente") ?? undefined) ??
      normalizeTextFilter(request.nextUrl.searchParams.get("arte") ?? undefined),
    dataFim: normalizeDateFilter(request.nextUrl.searchParams.get("dataFim") ?? undefined),
    dataInicio: normalizeDateFilter(request.nextUrl.searchParams.get("dataInicio") ?? undefined),
    evento: normalizeBooleanFilter(request.nextUrl.searchParams.get("evento") ?? undefined),
    id: normalizeTextFilter(request.nextUrl.searchParams.get("id") ?? undefined),
    page: normalizePageFilter(request.nextUrl.searchParams.get("page") ?? undefined),
    status: normalizeFichaStatus(request.nextUrl.searchParams.get("status") ?? undefined),
  };
  const result = await listFichasForOperationalPdf(filters);
  const weeklyMode = resolveWeeklyPdfMode(filters.dataInicio, filters.dataFim, filters.id, filters.status);
  const includeOverdue = request.nextUrl.searchParams.get("incluirAtrasadas") === "true";
  const overdueResult = weeklyMode && includeOverdue
    ? await listFichasForOperationalPdf({
        ...filters,
        dataFim: undefined,
        dataInicio: undefined,
        page: undefined,
        status: "atrasado",
      })
    : undefined;
  const pdf = generateOperationalFichasPdf(result, filters, {
    overdueResult,
    weeklyMode,
  });

  return new Response(pdf, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${buildFileName(filters, weeklyMode, includeOverdue)}"`,
      "Content-Type": "application/pdf",
    },
  });
}

function buildFileName(
  filters: {
    busca?: string;
    dataFim?: string;
    dataInicio?: string;
    evento?: boolean;
    page?: number;
    status?: string;
  },
  weeklyMode?: WeeklyPdfMode,
  includeOverdue = false,
) {
  const parts = [
    "fichas",
    "operacional",
    weeklyMode === "current-week" ? "esta-semana" : weeklyMode === "next-week" ? "proxima-semana" : "",
    includeOverdue ? "com-atrasadas" : "",
    filters.status ? sanitizeFileSegment(filters.status) : "",
    filters.evento === true ? "evento" : "",
    filters.busca ? sanitizeFileSegment(filters.busca) : "",
    filters.dataInicio ? formatFileDate(filters.dataInicio) : "",
    filters.dataFim ? formatFileDate(filters.dataFim) : "",
    filters.page && filters.page > 1 ? `pagina-${filters.page}` : "",
  ].filter(Boolean);

  return `${parts.join("_")}.pdf`;
}

function resolveWeeklyPdfMode(dataInicio?: string, dataFim?: string, id?: string, status?: string) {
  if (!dataInicio || !dataFim || id || status) {
    return undefined;
  }

  const currentWeek = getBusinessWeekRange();
  const nextWeek = getBusinessWeekRange(1);

  if (dataInicio === currentWeek.start && dataFim === currentWeek.end) {
    return "current-week";
  }

  if (dataInicio === nextWeek.start && dataFim === nextWeek.end) {
    return "next-week";
  }

  return undefined;
}

function formatFileDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year.slice(-2)}`;
}

function sanitizeFileSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
