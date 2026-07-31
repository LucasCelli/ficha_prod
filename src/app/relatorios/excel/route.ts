import { PassThrough, Readable } from "node:stream";
import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentSession } from "@/features/auth/session";
import {
  getRelatorioData,
  iterateRelatorioDetalhes,
  normalizeRelatorioDate,
  normalizeRelatorioEvento,
  normalizeRelatorioPeriodo,
  normalizeRelatorioStatus,
  type RelatorioData,
  type RelatorioFilters,
} from "@/features/relatorios/data";
import { getBusinessTodayInput } from "@/lib/dates";
import { reportServerError, withAuthenticatedRoute } from "@/lib/server/boundaries";

export const runtime = "nodejs";

async function handleGET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return new Response("Não autenticado.", { status: 401 });

  const filters: RelatorioFilters = {
    dataFim: normalizeRelatorioDate(request.nextUrl.searchParams.get("dataFim") ?? undefined),
    dataInicio: normalizeRelatorioDate(request.nextUrl.searchParams.get("dataInicio") ?? undefined),
    evento: normalizeRelatorioEvento(request.nextUrl.searchParams.get("evento") ?? undefined),
    periodo: normalizeRelatorioPeriodo(request.nextUrl.searchParams.get("periodo") ?? undefined),
    status: normalizeRelatorioStatus(request.nextUrl.searchParams.get("status") ?? undefined),
  };
  const result = await getRelatorioData(filters);

  if (result.kind !== "ok") {
    return new Response(result.kind === "error" ? result.message : "Relatório indisponível.", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      status: result.kind === "error" ? 500 : 503,
    });
  }

  const output = new PassThrough();
  void writeExcelWorkbook(output, result.data, filters).catch((error) => {
    const requestId = reportServerError("relatorios.excel.stream", error);
    output.destroy(new Error(`Falha ao gerar o relatório. Código: ${requestId}.`));
  });

  const fileName = `relatorio-producao-${result.data.filtros.periodo}-${getBusinessTodayInput()}.xlsx`;
  return new Response(Readable.toWeb(output) as ReadableStream<Uint8Array>, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}

async function writeExcelWorkbook(output: PassThrough, data: RelatorioData, filters: RelatorioFilters) {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: output,
    useSharedStrings: false,
    useStyles: true,
  });
  workbook.creator = "Ficha Primalhas";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Relatório", { views: [{ state: "frozen", ySplit: 2 }] });
  worksheet.columns = [
    { header: "Campo", key: "a", width: 28 },
    { header: "Valor", key: "b", width: 34 },
    { header: "Extra 1", key: "c", width: 18 },
    { header: "Extra 2", key: "d", width: 18 },
    { header: "Extra 3", key: "e", width: 18 },
    { header: "Extra 4", key: "f", width: 18 },
    { header: "Extra 5", key: "g", width: 18 },
  ];

  const title = worksheet.addRow(["Relatório de Produção"]);
  title.font = { bold: true, size: 16 };
  worksheet.mergeCells(title.number, 1, title.number, 7);
  commitRow(title);

  addSection(worksheet, "Resumo", [
    ["Período", data.periodoLabel],
    ["Fichas Entregues", data.resumo.fichasEntregues],
    ["Fichas Pendentes", data.resumo.fichasPendentes],
    ["Itens Confeccionados", data.resumo.itensConfeccionados],
    ["Novos Clientes", data.resumo.novosClientes],
  ]);
  addSection(worksheet, "Entrega", [
    ["Recorte atual", `${data.resumo.fichasEntregues} entregues no período`],
    ["Taxa de entrega", `${data.resumo.taxaEntrega}%`],
    ["Recorte anterior", `${data.resumo.entregasRecorteAnterior} entregues`],
    ["Recorte anual", `${data.resumo.entregasAnoAtual} entregues`],
  ]);
  addSection(worksheet, "Comparativo", [
    ["Fichas", data.comparativo.fichas],
    ["Itens", data.comparativo.itens],
    ["Clientes", data.comparativo.clientes],
    ["Taxa de entrega", `${data.comparativo.taxaEntrega}%`],
  ]);

  addSectionTitle(worksheet, "Dados Detalhados");
  addDataRow(worksheet, ["ID", "Cliente", "Vendedor", "Material", "Quantidade", "Status", "Data"], true);
  for await (const page of iterateRelatorioDetalhes(filters)) {
    for (const item of page) {
      addDataRow(worksheet, [item.id, item.cliente, item.vendedor, item.material, item.quantidade, item.status, item.data ?? ""]);
    }
  }

  addSection(worksheet, "Resumo por Vendedor", [
    ["Vendedor", "Fichas", "Itens", "Entregues", "Pendentes"],
    ...data.rankings.vendedores.map((item) => [item.label, item.totalFichas, item.totalItens, item.entregues, item.pendentes]),
  ], true);
  addRankSection(worksheet, "Materiais", "Material", data.rankings.materiais);
  addRankSection(worksheet, "Produtos", "Produto", data.rankings.produtos);
  addRankSection(worksheet, "Clientes", "Cliente", data.rankings.clientes);
  addRankSection(worksheet, "Tamanhos", "Tamanho", data.rankings.tamanhos);
  addRankSection(worksheet, "Personalizações", "Tipo", data.personalizacoes);

  worksheet.commit();
  await workbook.commit();
}

function addRankSection(
  worksheet: ExcelJS.Worksheet,
  title: string,
  label: string,
  items: Array<{ label: string; totalFichas: number; totalItens: number }>,
) {
  addSection(worksheet, title, [
    [label, "Fichas", "Itens"],
    ...items.map((item) => [item.label, item.totalFichas, item.totalItens]),
  ], true);
}

function addSection(
  worksheet: ExcelJS.Worksheet,
  title: string,
  rows: Array<Array<number | string>>,
  hasHeader = false,
) {
  addSectionTitle(worksheet, title);
  rows.forEach((row, index) => addDataRow(worksheet, row, hasHeader && index === 0));
}

function addSectionTitle(worksheet: ExcelJS.Worksheet, title: string) {
  commitRow(worksheet.addRow([]));
  const titleRow = worksheet.addRow([title]);
  titleRow.font = { bold: true, size: 12 };
  titleRow.fill = { fgColor: { argb: "FFEAF4FF" }, pattern: "solid", type: "pattern" };
  worksheet.mergeCells(titleRow.number, 1, titleRow.number, 7);
  commitRow(titleRow);
}

function addDataRow(worksheet: ExcelJS.Worksheet, values: Array<number | string>, header = false) {
  const row = worksheet.addRow(values);
  if (header) {
    row.font = { bold: true };
    row.fill = { fgColor: { argb: "FFF7FAFC" }, pattern: "solid", type: "pattern" };
  }
  commitRow(row);
}

function commitRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { color: { argb: "FFE8EDF5" }, style: "thin" } };
  });
  row.commit();
}

export const GET = withAuthenticatedRoute(handleGET, "src/app/relatorios/excel/route.ts");