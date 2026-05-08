import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/features/auth/session";
import {
  getRelatorioData,
  normalizeRelatorioDate,
  normalizeRelatorioEvento,
  normalizeRelatorioPeriodo,
  normalizeRelatorioStatus,
} from "@/features/relatorios/data";
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

  const body = buildExcelHtml(result.data);
  const fileName = `relatorio-producao-${result.data.filtros.periodo}-${getBusinessTodayInput()}.xls`;

  return new Response(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
    },
  });
}

function buildExcelHtml(data: NonNullable<Awaited<ReturnType<typeof getRelatorioData>>["data"]>) {
  const rows = [
    ["Relatório de Produção"],
    ["Período", data.periodoLabel],
    ["Fichas Entregues", data.resumo.fichasEntregues],
    ["Fichas Pendentes", data.resumo.fichasPendentes],
    ["Itens Confeccionados", data.resumo.itensConfeccionados],
    ["Novos Clientes", data.resumo.novosClientes],
    ["Taxa de Entrega", `${data.resumo.taxaEntrega}%`],
    ["Top Vendedor", data.resumo.topVendedor ?? "-"],
    [],
    ["Dados Detalhados"],
    ["ID", "Cliente", "Vendedor", "Material", "Quantidade", "Status", "Data"],
    ...data.detalhes.map((item) => [item.id, item.cliente, item.vendedor, item.material, item.quantidade, item.status, item.data ?? ""]),
    [],
    ["Resumo por Vendedor"],
    ["Vendedor", "Fichas", "Itens", "Entregues", "Pendentes"],
    ...data.rankings.vendedores.map((item) => [item.label, item.totalFichas, item.totalItens, item.entregues, item.pendentes]),
    [],
    ["Materiais"],
    ["Material", "Fichas", "Itens"],
    ...data.rankings.materiais.map((item) => [item.label, item.totalFichas, item.totalItens]),
    [],
    ["Produtos"],
    ["Produto", "Fichas", "Itens"],
    ...data.rankings.produtos.map((item) => [item.label, item.totalFichas, item.totalItens]),
    [],
    ["Tamanhos"],
    ["Tamanho", "Fichas", "Itens"],
    ...data.rankings.tamanhos.map((item) => [item.label, item.totalFichas, item.totalItens]),
  ];

  return [
    "<!doctype html>",
    '<html lang="pt-BR">',
    "<head>",
    '<meta charset="utf-8" />',
    "</head>",
    "<body>",
    "<table>",
    ...rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`),
    "</table>",
    "</body>",
    "</html>",
  ].join("");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
