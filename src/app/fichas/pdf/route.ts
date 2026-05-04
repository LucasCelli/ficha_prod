import type { NextRequest } from "next/server";
import {
  listFichasForOperationalPdf,
  normalizeBooleanFilter,
  normalizeDateFilter,
  normalizeFichaStatus,
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
    status: normalizeFichaStatus(request.nextUrl.searchParams.get("status") ?? undefined),
  };
  const result = await listFichasForOperationalPdf(filters);
  const weeklyMode = resolveWeeklyPdfMode(filters.dataInicio, filters.dataFim, filters.id, filters.status);
  const overdueResult = weeklyMode
    ? await listFichasForOperationalPdf({
        busca: filters.busca,
        evento: filters.evento,
        status: "atrasado",
      })
    : undefined;
  const pdf = generateOperationalFichasPdf(result, filters, {
    weeklyMode,
    overdueResult,
  });

  return new Response(pdf, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${buildFileName(filters.dataInicio, filters.dataFim, weeklyMode)}"`,
      "Content-Type": "application/pdf",
    },
  });
}

function buildFileName(dataInicio?: string, dataFim?: string, weeklyMode?: WeeklyPdfMode) {
  const prefix =
    weeklyMode === "current-week"
      ? "esta_semana"
      : weeklyMode === "next-week"
        ? "proxima_semana"
        : "fichas_operacional";
  const range = [dataInicio, dataFim]
    .filter((value): value is string => Boolean(value))
    .map(formatFileDate)
    .join("_");
  return range ? `${prefix}_${range}.pdf` : `${prefix}.pdf`;
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
