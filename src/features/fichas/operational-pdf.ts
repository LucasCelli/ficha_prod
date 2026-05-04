import jsPDF from "jspdf";
import { normalizePersonalizacaoLabel } from "@/lib/formatters";
import { getFichaOverdueDays, isFichaOverdue, type FichaFilters, type FichaListItem, type FichaListResult, type FichaStatus } from "./data";

type WeeklyPdfMode = "current-week" | "next-week";

type PdfGenerationOptions = {
  overdueResult?: FichaListResult;
  weeklyMode?: WeeklyPdfMode;
};

type PdfRow = {
  cliente: string;
  dataEntrega: string;
  dataInicio: string;
  isOverdue: boolean;
  personalizacao: string;
  statusBadgeLabel: string;
  statusBadgeTone: BadgeTone;
  vendedor: string;
};

type PdfSection = {
  groups: PdfGroup[];
  summary: string;
  title: string;
  tone: SectionTone;
};

type PdfGroup = {
  label: string;
  rows: PdfRow[];
};

type BadgeTone = "danger" | "neutral" | "success" | "warning";
type SectionTone = "danger" | "info";

const PAGE = {
  height: 841.89,
  marginBottom: 28,
  marginHorizontal: 24,
  marginTop: 24,
  width: 595.28,
};

const TABLE = {
  rowHeight: 24,
  widths: {
    cliente: 198,
    dataEntrega: 54,
    dataInicio: 54,
    status: 137,
    vendedor: 104,
  },
};

const COLORS = {
  badge: {
    danger: [192, 57, 43] as [number, number, number],
    neutral: [99, 110, 114] as [number, number, number],
    success: [39, 174, 96] as [number, number, number],
    warning: [230, 126, 34] as [number, number, number],
  },
  border: [218, 223, 231] as [number, number, number],
  muted: [92, 104, 118] as [number, number, number],
  paper: [255, 255, 255] as [number, number, number],
  rowAlt: [255, 255, 255] as [number, number, number],
  rowOverdue: [255, 255, 255] as [number, number, number],
  section: {
    danger: [190, 24, 93] as [number, number, number],
    info: [37, 99, 235] as [number, number, number],
  },
  text: [17, 24, 39] as [number, number, number],
};

const BUSINESS_TIME_ZONE = "America/Cuiaba";
const STATUS_LABELS: Record<FichaStatus, string> = {
  cancelado: "Cancelado",
  entregue: "Entregue",
  pendente: "Pendente",
};

export function generateOperationalFichasPdf(result: FichaListResult, filters: FichaFilters, options: PdfGenerationOptions = {}) {
  if (options.weeklyMode) {
    return generateWeeklyStyledPdf(result, filters, options.weeklyMode, options.overdueResult);
  }

  return generateDefaultOperationalPdf(result, filters);
}

function generateWeeklyStyledPdf(weeklyResult: FichaListResult, filters: FichaFilters, weeklyMode: WeeklyPdfMode, overdueResult?: FichaListResult) {
  const doc = new jsPDF({
    format: "a4",
    orientation: "portrait",
    unit: "pt",
  });

  const isWeeklyOk = weeklyResult.kind === "ok";
  const isOverdueOk = overdueResult?.kind === "ok";
  const overdueRows = isOverdueOk ? dedupeRows(overdueResult.fichas, []) : [];
  const weeklyRows = isWeeklyOk ? dedupeRows(weeklyResult.fichas, overdueRows) : [];

  if (!isWeeklyOk) {
    return renderFallbackPdf(
      doc,
      weeklyMode === "current-week" ? "Planejamento desta semana" : "Planejamento da próxima semana",
      weeklyResult.kind === "error" ? weeklyResult.message : "Supabase ainda não configurado.",
    );
  }

  const sections = buildWeeklySections(overdueRows, weeklyRows, weeklyMode);
  const modeMeta = getWeeklyModeMeta(weeklyMode);

  drawPageHeader(doc, {
    filters: formatFilters(filters),
    subtitle: "Compacto por personalização, com atrasados em prioridade e espaço de status para anotação.",
    title: modeMeta.title,
  });

  drawSummaryStrip(doc, overdueRows, weeklyRows, sections, modeMeta.summaryLabel);

  let cursorY = 172;

  if (sections.length === 0) {
    drawEmptyState(doc, cursorY, modeMeta.emptyMessage);
    return Buffer.from(doc.output("arraybuffer"));
  }

  for (const section of sections) {
    cursorY = ensureSectionSpace(doc, cursorY, 46);
    cursorY = drawSectionHeader(doc, cursorY, section);

    for (const group of section.groups) {
      cursorY = drawPaginatedGroup(doc, cursorY, group, section.tone);
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}

function buildWeeklySections(overdueFichas: FichaListItem[], weeklyFichas: FichaListItem[], weeklyMode: WeeklyPdfMode): PdfSection[] {
  const sections: PdfSection[] = [];
  const modeMeta = getWeeklyModeMeta(weeklyMode);

  if (overdueFichas.length > 0) {
    sections.push({
      groups: groupRowsByPersonalizacao(overdueFichas, "overdue"),
      summary: `${formatNumber(overdueFichas.length)} ficha(s) atrasada(s) pedindo ação imediata.`,
      title: "Atrasados com prioridade",
      tone: "danger",
    });
  }

  if (weeklyFichas.length > 0) {
    sections.push({
      groups: groupRowsByPersonalizacao(weeklyFichas, "upcoming"),
      summary: `${formatNumber(weeklyFichas.length)} ficha(s) ${modeMeta.sectionSummary}.`,
      title: modeMeta.sectionTitle,
      tone: "info",
    });
  }

  return sections;
}

function getWeeklyModeMeta(weeklyMode: WeeklyPdfMode) {
  if (weeklyMode === "current-week") {
    return {
      emptyMessage: "Nenhuma ficha encontrada para o recorte desta semana.",
      sectionSummary: "previstas para esta semana",
      sectionTitle: "Entrega programada para esta semana",
      summaryLabel: "Esta semana",
      title: "Planejamento de Produção · Esta Semana",
    };
  }

  return {
    emptyMessage: "Nenhuma ficha encontrada para o recorte da próxima semana.",
    sectionSummary: "previstas para a próxima semana",
    sectionTitle: "Entrega programada para a próxima semana",
    summaryLabel: "Próxima semana",
    title: "Planejamento de Produção · Próxima Semana",
  };
}

function groupRowsByPersonalizacao(fichas: FichaListItem[], mode: "overdue" | "upcoming"): PdfGroup[] {
  const groups = new Map<string, PdfRow[]>();

  for (const ficha of fichas) {
    const label = normalizePersonalizacaoLabel(ficha.arte);
    const current = groups.get(label) ?? [];
    current.push(toPdfRow(ficha));
    groups.set(label, current);
  }

  return Array.from(groups.entries())
    .map(([label, rows]) => ({
      label,
      rows: rows.sort((a, b) => comparePdfRows(a, b, mode)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function toPdfRow(ficha: FichaListItem): PdfRow {
  const overdue = isFichaOverdue(ficha);
  const venda = ficha.numero_venda ? ` #${ficha.numero_venda}` : "";
  const clienteBase = `${ficha.cliente_nome_snapshot}${venda}`;

  return {
    cliente: overdue ? `${clienteBase} · ${getFichaOverdueDays(ficha)}d atrasada` : clienteBase,
    dataEntrega: formatShortDate(ficha.data_entrega),
    dataInicio: ficha.data_inicio ? formatShortDate(ficha.data_inicio) : "—",
    isOverdue: overdue,
    personalizacao: normalizePersonalizacaoLabel(ficha.arte),
    statusBadgeLabel: overdue ? "Atrasado" : STATUS_LABELS[ficha.status],
    statusBadgeTone: overdue ? "danger" : getStatusTone(ficha.status),
    vendedor: ficha.vendedor || "Sem vendedor",
  };
}

function comparePdfRows(a: PdfRow, b: PdfRow, mode: "overdue" | "upcoming") {
  if (mode === "overdue") {
    return a.dataEntrega.localeCompare(b.dataEntrega) || a.cliente.localeCompare(b.cliente, "pt-BR");
  }

  return a.dataEntrega.localeCompare(b.dataEntrega) || a.vendedor.localeCompare(b.vendedor, "pt-BR") || a.cliente.localeCompare(b.cliente, "pt-BR");
}

function dedupeRows(primary: FichaListItem[], existing: FichaListItem[]) {
  const knownIds = new Set(existing.map((item) => item.id));
  return primary.filter((item) => !knownIds.has(item.id));
}

function drawPageHeader(doc: jsPDF, content: { filters: string; subtitle: string; title: string }) {
  const width = PAGE.width - PAGE.marginHorizontal * 2;
  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(...COLORS.paper);
  doc.roundedRect(PAGE.marginHorizontal, PAGE.marginTop, width, 74, 12, 12, "FD");

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(sanitizePdfText(content.title), PAGE.marginHorizontal + 18, PAGE.marginTop + 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const subtitleLines = doc.splitTextToSize(sanitizePdfText(content.subtitle), width - 36);
  const filtersLines = doc.splitTextToSize(
    sanitizePdfText(`Gerado em ${formatDateTime(new Date())} · Filtros: ${content.filters}`),
    width - 36,
  );
  doc.text(subtitleLines, PAGE.marginHorizontal + 18, PAGE.marginTop + 42);
  doc.text(filtersLines, PAGE.marginHorizontal + 18, PAGE.marginTop + 58);
}

function drawSummaryStrip(doc: jsPDF, overdueRows: FichaListItem[], weeklyRows: FichaListItem[], sections: PdfSection[], weeklyLabel: string) {
  const summaryItems = [
    { label: "Atrasados", tone: "danger" as const, value: overdueRows.length },
    { label: weeklyLabel, tone: "info" as const, value: weeklyRows.length },
    { label: "Personalizações", tone: "info" as const, value: sections.reduce((total, section) => total + section.groups.length, 0) },
  ];

  const gap = 10;
  const totalWidth = PAGE.width - PAGE.marginHorizontal * 2;
  const cardWidth = (totalWidth - gap * (summaryItems.length - 1)) / summaryItems.length;
  let x = PAGE.marginHorizontal;
  const y = 112;

  summaryItems.forEach((item) => {
    const accentColor = item.tone === "danger" ? COLORS.section.danger : COLORS.section.info;

    doc.setDrawColor(...COLORS.border);
    doc.setFillColor(...COLORS.paper);
    doc.roundedRect(x, y, cardWidth, 42, 10, 10, "FD");
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(sanitizePdfText(item.label.toUpperCase()), x + 12, y + 15);
    doc.setTextColor(...accentColor);
    doc.setFontSize(16);
    doc.text(String(item.value), x + 12, y + 31);
    x += cardWidth + gap;
  });
}

function drawSectionHeader(doc: jsPDF, topY: number, section: PdfSection) {
  const accentColor = section.tone === "danger" ? COLORS.section.danger : COLORS.section.info;

  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(...COLORS.paper);
  doc.roundedRect(PAGE.marginHorizontal, topY, PAGE.width - PAGE.marginHorizontal * 2, 40, 10, 10, "FD");

  doc.setTextColor(...accentColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(sanitizePdfText(section.title), PAGE.marginHorizontal + 12, topY + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(sanitizePdfText(section.summary), PAGE.marginHorizontal + 12, topY + 30);

  return topY + 50;
}

function drawGroupHeader(doc: jsPDF, topY: number, label: string, count: number, tone: SectionTone) {
  const accentColor = tone === "danger" ? COLORS.section.danger : COLORS.section.info;
  doc.setFillColor(...COLORS.paper);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(PAGE.marginHorizontal, topY, PAGE.width - PAGE.marginHorizontal * 2, 24, 8, 8, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...accentColor);
  doc.text(sanitizePdfText(label), PAGE.marginHorizontal + 10, topY + 15);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text(`${formatNumber(count)} ficha(s)`, PAGE.width - PAGE.marginHorizontal - 70, topY + 15, { align: "right" });

  return topY + 28;
}

function drawPaginatedGroup(doc: jsPDF, cursorY: number, group: PdfGroup, tone: SectionTone) {
  let rowIndex = 0;
  let chunkIndex = 0;

  while (rowIndex < group.rows.length) {
    cursorY = ensureSectionSpace(doc, cursorY, 28 + 20 + TABLE.rowHeight);
    cursorY = drawGroupHeader(doc, cursorY, chunkIndex === 0 ? group.label : `${group.label} · continua`, group.rows.length, tone);
    cursorY = drawTableHeader(doc, cursorY);

    while (rowIndex < group.rows.length && cursorY + TABLE.rowHeight <= PAGE.height - PAGE.marginBottom) {
      cursorY = drawCompactRow(doc, cursorY, group.rows[rowIndex], rowIndex);
      rowIndex += 1;
    }

    if (rowIndex < group.rows.length) {
      doc.addPage("a4", "portrait");
      drawContinuationHeader(doc);
      cursorY = 50;
      chunkIndex += 1;
      continue;
    }

    cursorY += 8;
  }

  return cursorY;
}

function drawTableHeader(doc: jsPDF, topY: number) {
  const x = PAGE.marginHorizontal;
  const tableWidth = PAGE.width - PAGE.marginHorizontal * 2;

  doc.setDrawColor(...COLORS.border);
  doc.line(x, topY, x + tableWidth, topY);
  doc.line(x, topY + 20, x + tableWidth, topY + 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);

  const columns = getColumnPositions();
  doc.text("Cliente", columns.cliente + 8, topY + 13);
  doc.text("Vendedor", columns.vendedor + 8, topY + 13);
  doc.text("Início", columns.dataInicio + 8, topY + 13);
  doc.text("Entrega", columns.dataEntrega + 8, topY + 13);
  doc.text("Status", columns.status + 8, topY + 13);

  return topY + 20;
}

function drawCompactRow(doc: jsPDF, topY: number, row: PdfRow, index: number) {
  const x = PAGE.marginHorizontal;
  const tableWidth = PAGE.width - PAGE.marginHorizontal * 2;
  const bgColor = row.isOverdue ? COLORS.rowOverdue : index % 2 === 0 ? COLORS.paper : COLORS.rowAlt;
  const columns = getColumnPositions();

  doc.setFillColor(...bgColor);
  doc.rect(x, topY, tableWidth, TABLE.rowHeight, "F");
  doc.setDrawColor(...COLORS.border);
  doc.line(x, topY + TABLE.rowHeight, x + tableWidth, topY + TABLE.rowHeight);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...COLORS.text);
  doc.text(truncateText(doc, row.cliente, TABLE.widths.cliente - 14), columns.cliente + 8, topY + 15);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);
  doc.text(truncateText(doc, row.vendedor, TABLE.widths.vendedor - 14), columns.vendedor + 8, topY + 15);
  doc.text(row.dataInicio, columns.dataInicio + 8, topY + 15);
  doc.text(row.dataEntrega, columns.dataEntrega + 8, topY + 15);

  drawStatusCell(doc, columns.status + 8, topY + 5, row.statusBadgeLabel, row.statusBadgeTone);

  return topY + TABLE.rowHeight;
}

function drawStatusCell(doc: jsPDF, x: number, y: number, label: string, tone: BadgeTone) {
  const badgeWidth = Math.max(44, Math.min(62, doc.getTextWidth(sanitizePdfText(label)) + 10));
  const badgeColor = COLORS.badge[tone];

  doc.setDrawColor(...badgeColor);
  doc.setFillColor(...COLORS.paper);
  doc.roundedRect(x, y, badgeWidth, 13, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...badgeColor);
  doc.text(sanitizePdfText(label), x + badgeWidth / 2, y + 8.8, { align: "center" });

  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(x + badgeWidth + 6, y - 0.5, 68, 14, 4, 4, "S");
}

function drawEmptyState(doc: jsPDF, topY: number, message: string) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(PAGE.marginHorizontal, topY, PAGE.width - PAGE.marginHorizontal * 2, 72, 12, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.text);
  doc.text("Nada para exportar", PAGE.marginHorizontal + 16, topY + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text(sanitizePdfText(message), PAGE.marginHorizontal + 16, topY + 48);
}

function ensureSectionSpace(doc: jsPDF, cursorY: number, requiredHeight: number) {
  if (cursorY + requiredHeight <= PAGE.height - PAGE.marginBottom) {
    return cursorY;
  }

  doc.addPage("a4", "portrait");
  drawContinuationHeader(doc);
  return 50;
}

function drawContinuationHeader(doc: jsPDF) {
  doc.setDrawColor(...COLORS.border);
  doc.line(PAGE.marginHorizontal, 34, PAGE.width - PAGE.marginHorizontal, 34);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Planejamento de produção · continuação", PAGE.marginHorizontal, 22);
}

function getColumnPositions() {
  const cliente = PAGE.marginHorizontal;
  const vendedor = cliente + TABLE.widths.cliente;
  const dataInicio = vendedor + TABLE.widths.vendedor;
  const dataEntrega = dataInicio + TABLE.widths.dataInicio;
  const status = dataEntrega + TABLE.widths.dataEntrega;

  return { cliente, dataEntrega, dataInicio, status, vendedor };
}

function truncateText(doc: jsPDF, value: string, maxWidth: number) {
  const sanitized = sanitizePdfText(value);
  if (doc.getTextWidth(sanitized) <= maxWidth) {
    return sanitized;
  }

  let text = sanitized;
  while (text.length > 1 && doc.getTextWidth(`${text}…`) > maxWidth) {
    text = text.slice(0, -1);
  }

  return `${text}…`;
}

function getStatusTone(status: FichaStatus): BadgeTone {
  switch (status) {
    case "entregue":
      return "success";
    case "cancelado":
      return "neutral";
    default:
      return "warning";
  }
}

function generateDefaultOperationalPdf(result: FichaListResult, filters: FichaFilters) {
  const lines = buildOperationalLines(result, filters);
  return createSimpleTextPdf(lines);
}

function buildOperationalLines(result: FichaListResult, filters: FichaFilters) {
  const lines = [
    "Relatório operacional de fichas",
    `Gerado em ${formatDateTime(new Date())}`,
    `Filtros: ${formatFilters(filters)}`,
    "",
  ];

  if (result.kind === "not-configured") {
    lines.push("Supabase ainda não configurado.", "Configure as variáveis de ambiente para carregar dados reais.");
    return lines;
  }

  if (result.kind === "error") {
    lines.push("Falha ao consultar fichas.", result.message);
    return lines;
  }

  if (result.fichas.length === 0) {
    lines.push("Nenhuma ficha encontrada para os filtros atuais.");
    return lines;
  }

  lines.push(`Total encontrado: ${formatNumber(result.total)}`);
  lines.push("");

  for (const group of groupByDateAndPersonalizacao(result.fichas)) {
    lines.push(group.dateLabel);

    for (const personalizationGroup of group.groups) {
      lines.push(`  ${personalizationGroup.label} - ${formatNumber(personalizationGroup.fichas.length)} ficha(s)`);

      for (const ficha of personalizationGroup.fichas) {
        const venda = ficha.numero_venda ? `Venda ${ficha.numero_venda}` : "Sem venda";
        const vendedor = ficha.vendedor ?? "Sem vendedor";
        const inicio = ficha.data_inicio ? ` | Início ${formatShortDate(ficha.data_inicio)}` : "";
        const evento = ficha.evento ? " | Evento" : "";
        lines.push(`    ${ficha.cliente_nome_snapshot} | ${venda} | ${STATUS_LABELS[ficha.status]} | ${vendedor}${inicio}${evento}`);
      }
    }

    lines.push("");
  }

  return lines;
}

function groupByDateAndPersonalizacao(fichas: FichaListItem[]) {
  const dateGroups = new Map<string, Map<string, FichaListItem[]>>();

  for (const ficha of fichas) {
    const dateLabel = formatLongDate(ficha.data_entrega);
    const personalization = normalizePersonalizacaoLabel(ficha.arte);
    const personalizationGroups = dateGroups.get(dateLabel) ?? new Map<string, FichaListItem[]>();
    const current = personalizationGroups.get(personalization) ?? [];
    current.push(ficha);
    personalizationGroups.set(personalization, current);
    dateGroups.set(dateLabel, personalizationGroups);
  }

  return Array.from(dateGroups.entries()).map(([dateLabel, personalizationGroups]) => ({
    dateLabel,
    groups: Array.from(personalizationGroups.entries())
      .map(([label, groupFichas]) => ({
        fichas: groupFichas,
        label,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
  }));
}

function createSimpleTextPdf(lines: string[]) {
  const pages = paginateLines(lines, 46);
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");

  for (const pageLines of pages) {
    const content = buildPageContent(pageLines);
    const contentObjectId = objects.length + 2;
    const pageObjectId = objects.length + 3;

    objects.push(`<< /Length ${Buffer.byteLength(content, "binary")} >>\nstream\n${content}\nendstream`);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    pageObjectIds.push(pageObjectId);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;
  objects.splice(2, 0, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  return assemblePdf(objects);
}

function renderFallbackPdf(doc: jsPDF, title: string, message: string) {
  drawPageHeader(doc, {
    filters: "sem dados",
    subtitle: "Não foi possível montar o PDF operacional solicitado.",
    title,
  });
  drawEmptyState(doc, 116, message);
  return Buffer.from(doc.output("arraybuffer"));
}

function paginateLines(lines: string[], perPage: number) {
  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += perPage) {
    pages.push(lines.slice(index, index + perPage));
  }

  return pages.length ? pages : [[""]];
}

function buildPageContent(lines: string[]) {
  const content = ["BT", "/F1 10 Tf", "14 TL", "50 800 Td"];

  lines.forEach((line, index) => {
    if (index > 0) content.push("T*");
    content.push(`(${escapePdfText(line)}) Tj`);
  });

  content.push("ET");
  return content.join("\n");
}

function assemblePdf(objects: string[]) {
  const offsets: number[] = [0];
  let body = "";

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength("%PDF-1.4\n", "binary") + Buffer.byteLength(body, "binary"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength("%PDF-1.4\n", "binary") + Buffer.byteLength(body, "binary");
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");

  return Buffer.from(`%PDF-1.4\n${body}${xref}`, "binary");
}

function escapePdfText(value: string) {
  return sanitizePdfText(value).replace(/[^\x20-\x7E]/g, "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function sanitizePdfText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatLongDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(value);
}

function formatFilters(filters: FichaFilters) {
  const entries = [
    filters.busca ? `busca=${filters.busca}` : "",
    filters.status ? `status=${filters.status}` : "",
    typeof filters.evento === "boolean" ? `evento=${filters.evento ? "sim" : "não"}` : "",
    filters.dataInicio ? `inicio=${filters.dataInicio}` : "",
    filters.dataFim ? `fim=${filters.dataFim}` : "",
  ].filter(Boolean);

  return entries.length ? entries.join(", ") : "sem filtros";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
