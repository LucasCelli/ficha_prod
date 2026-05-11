import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentSession } from "@/features/auth/session";
import {
  getRelatorioData,
  normalizeRelatorioDate,
  normalizeRelatorioEvento,
  normalizeRelatorioPeriodo,
  normalizeRelatorioStatus,
} from "@/features/relatorios/data";
import type { RelatorioData } from "@/features/relatorios/data";
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

  const body = await buildExcelWorkbook(result.data);
  const fileName = `relatorio-producao-${result.data.filtros.periodo}-${getBusinessTodayInput()}.xlsx`;

  return new Response(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}

async function buildExcelWorkbook(data: RelatorioData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ficha Primalhas";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Relatório", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

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

  addSection(
    worksheet,
    "Dados Detalhados",
    [
      ["ID", "Cliente", "Vendedor", "Material", "Quantidade", "Status", "Data"],
      ...data.detalhes.map((item) => [item.id, item.cliente, item.vendedor, item.material, item.quantidade, item.status, item.data ?? ""]),
    ],
    true,
  );

  addSection(worksheet, "Resumo por Vendedor", [
    ["Vendedor", "Fichas", "Itens", "Entregues", "Pendentes"],
    ...data.rankings.vendedores.map((item) => [item.label, item.totalFichas, item.totalItens, item.entregues, item.pendentes]),
  ], true);

  addRankSection(worksheet, "Materiais", "Material", data.rankings.materiais);
  addRankSection(worksheet, "Produtos", "Produto", data.rankings.produtos);
  addRankSection(worksheet, "Clientes", "Cliente", data.rankings.clientes);
  addRankSection(worksheet, "Tamanhos", "Tamanho", data.rankings.tamanhos);
  addRankSection(worksheet, "Personalizações", "Tipo", data.personalizacoes);

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle" };
      cell.border = {
        bottom: { color: { argb: "FFE8EDF5" }, style: "thin" },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as BodyInit;
}

function addRankSection(
  worksheet: ExcelJS.Worksheet,
  title: string,
  label: string,
  items: Array<{ label: string; totalFichas: number; totalItens: number }>,
) {
  addSection(
    worksheet,
    title,
    [
      [label, "Fichas", "Itens"],
      ...items.map((item) => [item.label, item.totalFichas, item.totalItens]),
    ],
    true,
  );
}

function addSection(worksheet: ExcelJS.Worksheet, title: string, rows: Array<Array<number | string>>, hasHeader = false) {
  worksheet.addRow([]);
  const titleRow = worksheet.addRow([title]);
  titleRow.font = { bold: true, size: 12 };
  titleRow.fill = {
    fgColor: { argb: "FFEAF4FF" },
    pattern: "solid",
    type: "pattern",
  };
  worksheet.mergeCells(titleRow.number, 1, titleRow.number, 7);

  rows.forEach((row, index) => {
    const excelRow = worksheet.addRow(row);

    if (hasHeader && index === 0) {
      excelRow.font = { bold: true };
      excelRow.fill = {
        fgColor: { argb: "FFF7FAFC" },
        pattern: "solid",
        type: "pattern",
      };
    }
  });
}
