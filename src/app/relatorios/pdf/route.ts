import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/features/auth/session";
import {
  getRelatorioData,
  normalizeRelatorioDate,
  normalizeRelatorioEvento,
  normalizeRelatorioPeriodo,
  normalizeRelatorioStatus,
} from "@/features/relatorios/data";
import { generateRelatorioPdf } from "@/features/relatorios/relatorio-pdf";
import { getBusinessTodayInput } from "@/lib/dates";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const filters = {
    dataFim: normalizeRelatorioDate(request.nextUrl.searchParams.get("dataFim") ?? undefined),
    dataInicio: normalizeRelatorioDate(request.nextUrl.searchParams.get("dataInicio") ?? undefined),
    evento: normalizeRelatorioEvento(request.nextUrl.searchParams.get("evento") ?? undefined),
    periodo: normalizeRelatorioPeriodo(request.nextUrl.searchParams.get("periodo") ?? undefined),
    status: normalizeRelatorioStatus(request.nextUrl.searchParams.get("status") ?? undefined),
  };
  const result = await getRelatorioData(filters);

  if (result.kind !== "ok") {
    return new Response(result.kind === "error" ? result.message : "Relatório indisponível.", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
      status: result.kind === "error" ? 500 : 503,
    });
  }

  const pdf = generateRelatorioPdf(result.data);
  const fileName = `relatorio-producao-${result.data.filtros.periodo}-${getBusinessTodayInput()}.pdf`;

  return new Response(pdf, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/pdf",
    },
  });
}
