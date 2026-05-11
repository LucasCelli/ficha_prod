import jsPDF from "jspdf";
import type { RelatorioData } from "./data";

const PAGE = {
  height: 841.89,
  marginBottom: 32,
  marginHorizontal: 32,
  marginTop: 32,
  width: 595.28,
};

const COLORS = {
  border: [218, 223, 231] as [number, number, number],
  danger: [207, 19, 34] as [number, number, number],
  info: [22, 119, 255] as [number, number, number],
  muted: [95, 107, 122] as [number, number, number],
  paper: [255, 255, 255] as [number, number, number],
  surface: [247, 250, 252] as [number, number, number],
  text: [20, 27, 45] as [number, number, number],
};

type PdfRow = Array<number | string>;

export function generateRelatorioPdf(data: RelatorioData) {
  const doc = new jsPDF({
    format: "a4",
    orientation: "portrait",
    unit: "pt",
  });

  drawHeader(doc, data);

  let cursorY = 104;
  cursorY = drawSummaryCards(doc, cursorY, data);
  cursorY = drawDeliverySection(doc, cursorY + 14, data);
  cursorY = drawComparisonSection(doc, cursorY + 14, data);
  cursorY = drawTableSection(
    doc,
    cursorY + 14,
    "Resumo por Vendedor",
    ["Vendedor", "Fichas", "Itens", "Entregues", "Pendentes"],
    data.rankings.vendedores.map((item) => [item.label, item.totalFichas, item.totalItens, item.entregues, item.pendentes]),
  );
  cursorY = drawTableSection(
    doc,
    cursorY + 14,
    "Materiais",
    ["Material", "Fichas", "Itens"],
    data.rankings.materiais.map((item) => [item.label, item.totalFichas, item.totalItens]),
  );
  cursorY = drawTableSection(
    doc,
    cursorY + 14,
    "Produtos",
    ["Produto", "Fichas", "Itens"],
    data.rankings.produtos.map((item) => [item.label, item.totalFichas, item.totalItens]),
  );
  drawTableSection(
    doc,
    cursorY + 14,
    "Personalizações",
    ["Tipo", "Fichas", "Itens"],
    data.personalizacoes.map((item) => [item.label, item.totalFichas, item.totalItens]),
  );

  drawFooter(doc);
  return Buffer.from(doc.output("arraybuffer"));
}

function drawHeader(doc: jsPDF, data: RelatorioData) {
  doc.setFillColor(...COLORS.paper);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Relatórios", PAGE.marginHorizontal, PAGE.marginTop);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(22);
  doc.text("Relatório de Produção", PAGE.marginHorizontal, PAGE.marginTop + 28);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.periodoLabel, PAGE.marginHorizontal, PAGE.marginTop + 48);
}

function drawSummaryCards(doc: jsPDF, y: number, data: RelatorioData) {
  const items = [
    ["Fichas entregues", data.resumo.fichasEntregues],
    ["Fichas pendentes", data.resumo.fichasPendentes],
    ["Itens confeccionados", data.resumo.itensConfeccionados],
    ["Novos clientes", data.resumo.novosClientes],
  ] as const;
  const gap = 8;
  const width = (PAGE.width - PAGE.marginHorizontal * 2 - gap * 3) / 4;

  items.forEach(([label, value], index) => {
    const x = PAGE.marginHorizontal + index * (width + gap);
    drawCard(doc, x, y, width, 56);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(label.toUpperCase(), x + 10, y + 18);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(16);
    doc.text(formatNumber(value), x + 10, y + 40);
  });

  return y + 56;
}

function drawDeliverySection(doc: jsPDF, y: number, data: RelatorioData) {
  y = ensureSpace(doc, y, 124);
  drawSectionBox(doc, y, 124);
  drawSectionTitle(doc, "Entrega", y + 20);

  const meterColor = getDeliveryColor(data.resumo.taxaEntrega);
  const centerX = PAGE.marginHorizontal + 56;
  const centerY = y + 70;
  doc.setDrawColor(...meterColor);
  doc.setLineWidth(9);
  doc.circle(centerX, centerY, 32, "S");
  doc.setTextColor(...meterColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`${formatNumber(data.resumo.taxaEntrega)}%`, centerX, centerY + 5, { align: "center" });

  const rows = [
    ["Recorte atual", `${formatNumber(data.resumo.fichasEntregues)} entregues no período`],
    ["Recorte anterior", `${formatNumber(data.resumo.entregasRecorteAnterior)} entregues`],
    ["Recorte anual", `${formatNumber(data.resumo.entregasAnoAtual)} entregues`],
  ];

  rows.forEach(([label, value], index) => {
    const rowY = y + 48 + index * 22;
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, PAGE.marginHorizontal + 112, rowY);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(11);
    doc.text(value, PAGE.marginHorizontal + 212, rowY);
  });

  return y + 124;
}

function drawComparisonSection(doc: jsPDF, y: number, data: RelatorioData) {
  const rows = [
    ["Fichas", data.comparativo.fichas],
    ["Itens", data.comparativo.itens],
    ["Clientes", data.comparativo.clientes],
    ["Taxa de entrega", `${data.comparativo.taxaEntrega}%`],
  ];

  return drawTableSection(doc, y, "Comparativo com Período Anterior", ["Indicador", "Variação"], rows);
}

function drawTableSection(doc: jsPDF, y: number, title: string, headers: string[], rows: PdfRow[]) {
  const limitedRows = rows.slice(0, 12);
  const rowHeight = 20;
  const height = 38 + rowHeight * Math.max(1, limitedRows.length + 1);
  y = ensureSpace(doc, y, height);

  drawSectionBox(doc, y, height);
  drawSectionTitle(doc, title, y + 20);

  const x = PAGE.marginHorizontal + 12;
  const width = PAGE.width - PAGE.marginHorizontal * 2 - 24;
  const colWidth = width / headers.length;
  let rowY = y + 42;

  drawTableRow(doc, x, rowY, headers, colWidth, true);
  rowY += rowHeight;

  if (limitedRows.length === 0) {
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Nenhum dado encontrado no período.", x, rowY + 13);
    return y + height;
  }

  for (const row of limitedRows) {
    drawTableRow(doc, x, rowY, row.map(String), colWidth, false);
    rowY += rowHeight;
  }

  return y + height;
}

function drawTableRow(doc: jsPDF, x: number, y: number, cells: string[], colWidth: number, header: boolean) {
  doc.setFont("helvetica", header ? "bold" : "normal");
  doc.setFontSize(header ? 8 : 8.5);
  doc.setTextColor(...(header ? COLORS.muted : COLORS.text));

  cells.forEach((cell, index) => {
    const value = truncateText(doc, cell, colWidth - 8);
    doc.text(value, x + index * colWidth, y + 13);
  });

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.line(x, y + 19, x + colWidth * cells.length, y + 19);
}

function drawCard(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setFillColor(...COLORS.paper);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, width, height, 7, 7, "FD");
}

function drawSectionBox(doc: jsPDF, y: number, height: number) {
  doc.setFillColor(...COLORS.paper);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.6);
  doc.roundedRect(PAGE.marginHorizontal, y, PAGE.width - PAGE.marginHorizontal * 2, height, 7, 7, "FD");
}

function drawSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, PAGE.marginHorizontal + 12, y);
}

function ensureSpace(doc: jsPDF, y: number, requiredHeight: number) {
  if (y + requiredHeight <= PAGE.height - PAGE.marginBottom) {
    return y;
  }

  doc.addPage();
  doc.setFillColor(...COLORS.paper);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");
  return PAGE.marginTop;
}

function drawFooter(doc: jsPDF) {
  const total = doc.getNumberOfPages();

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Página ${page} de ${total}`, PAGE.width - PAGE.marginHorizontal, PAGE.height - 18, { align: "right" });
  }
}

function getDeliveryColor(value: number) {
  if (value >= 90) return [35, 120, 4] as [number, number, number];
  if (value >= 70) return [212, 161, 6] as [number, number, number];
  if (value >= 40) return [212, 107, 8] as [number, number, number];
  return COLORS.danger;
}

function truncateText(doc: jsPDF, value: string, maxWidth: number) {
  if (doc.getTextWidth(value) <= maxWidth) return value;

  let output = value;
  while (output.length > 1 && doc.getTextWidth(`${output}...`) > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}...`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
