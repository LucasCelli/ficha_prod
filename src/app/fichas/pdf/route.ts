import type { NextRequest } from "next/server";
import {
  listFichasForOperationalPdf,
  normalizeBooleanFilter,
  normalizeDateFilter,
  normalizeFichaStatus,
  normalizePageFilter,
  normalizeTextFilter,
} from "@/features/fichas/data";
import { generateOperationalFichasPdf } from "@/features/fichas/operational-pdf";

type WeeklyPdfMode = "current-week" | "next-week";

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
    page: normalizePageFilter(request.nextUrl.searchParams.get("page") ?? undefined),
    status: normalizeFichaStatus(request.nextUrl.searchParams.get("status") ?? undefined),
  };
  const result = await listFichasForOperationalPdf(filters);
  const weeklyMode = resolveWeeklyPdfMode(filters.dataInicio, filters.dataFim, filters.id, filters.status);
  const pdf = generateOperationalFichasPdf(result, filters, {
    weeklyMode,
  });

  return new Response(pdf, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${buildFileName(filters, weeklyMode)}"`,
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
) {
  const parts = [
    "fichas",
    "operacional",
    weeklyMode === "current-week" ? "esta-semana" : weeklyMode === "next-week" ? "proxima-semana" : "",
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

  const today = getBusinessToday();
  const currentWeekStart = startOfWeek(today);
  const currentWeekEnd = addDays(currentWeekStart, 6);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const nextWeekEnd = addDays(nextWeekStart, 6);

  if (dataInicio === formatDateInput(currentWeekStart) && dataFim === formatDateInput(currentWeekEnd)) {
    return "current-week";
  }

  if (dataInicio === formatDateInput(nextWeekStart) && dataFim === formatDateInput(nextWeekEnd)) {
    return "next-week";
  }

  return undefined;
}

function getBusinessToday() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Cuiaba",
  });

  return new Date(`${formatter.format(new Date())}T00:00:00`);
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + mondayOffset);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
