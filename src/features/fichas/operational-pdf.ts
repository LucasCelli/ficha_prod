import jsPDF from "jspdf";
import { getKanbanColumnLabel } from "@/features/quadro-producao/config";
import { formatBusinessDateTime, formatDayMonthInput } from "@/lib/dates";
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
  etapa: string;
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

type PdfSummaryItem = {
  label: string;
  tone: SectionTone;
  value: number;
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
    cliente: 186,
    dataEntrega: 46,
    dataInicio: 46,
    etapa: 112,
    status: 70,
    vendedor: 87,
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
      weeklyResult.kind === "error" ? weeklyResult.message : "Relatório indisponível.",
    );
  }

  const sections = buildWeeklySections(overdueRows, weeklyRows, weeklyMode);
  const modeMeta = getWeeklyModeMeta(weeklyMode);

  drawPageHeader(doc, {
    filters: formatFilters(filters),
    subtitle: "Compacto por personalização, com atrasados em prioridade e status de produção.",
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
      title: "Atrasadas com prioridade",
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
    etapa: getKanbanColumnLabel(ficha.kanban_column?.slug ?? ficha.kanban_status, ficha.arte, ficha.kanban_column?.name),
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
  const previousOverdueCount = overdueRows.length + weeklyRows.filter((ficha) => isFichaOverdue(ficha)).length;
  const summaryItems: PdfSummaryItem[] = [
    { label: "Atrasadas anteriores", tone: previousOverdueCount > 0 ? "danger" : "info", value: previousOverdueCount },
    { label: "Atrasadas atuais", tone: "info", value: 0 },
    { label: weeklyLabel, tone: "info" as const, value: weeklyRows.length },
    { label: "Personalizações", tone: "info" as const, value: sections.reduce((total, section) => total + section.groups.length, 0) },
  ];

  drawMetricStrip(doc, summaryItems);
}

function drawMetricStrip(doc: jsPDF, summaryItems: PdfSummaryItem[]) {
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

  while (rowIndex < group.rows.length) {
    cursorY = ensureSectionSpace(doc, cursorY, 28 + 20 + TABLE.rowHeight);
    cursorY = drawGroupHeader(doc, cursorY, group.label, group.rows.length, tone);
    cursorY = drawTableHeader(doc, cursorY);

    while (rowIndex < group.rows.length && cursorY + TABLE.rowHeight <= PAGE.height - PAGE.marginBottom) {
      cursorY = drawCompactRow(doc, cursorY, group.rows[rowIndex], rowIndex);
      rowIndex += 1;
    }

    if (rowIndex < group.rows.length) {
      doc.addPage("a4", "portrait");
      drawContinuationHeader(doc);
      cursorY = 50;
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
  doc.text("Etapa", columns.etapa + 8, topY + 13);
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
  doc.text(truncateText(doc, row.etapa, TABLE.widths.etapa - 14), columns.etapa + 8, topY + 15);
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
}

function getColumnPositions() {
  const cliente = PAGE.marginHorizontal;
  const vendedor = cliente + TABLE.widths.cliente;
  const etapa = vendedor + TABLE.widths.vendedor;
  const dataInicio = etapa + TABLE.widths.etapa;
  const dataEntrega = dataInicio + TABLE.widths.dataInicio;
  const status = dataEntrega + TABLE.widths.dataEntrega;

  return { cliente, dataEntrega, dataInicio, etapa, status, vendedor };
}

function truncateText(doc: jsPDF, value: string, maxWidth: number) {
  const sanitized = sanitizePdfText(value);
  if (doc.getTextWidth(sanitized) <= maxWidth) {
    return sanitized;
  }

  let text = sanitized;
  while (text.length > 1 && doc.getTextWidth(`${text}...`) > maxWidth) {
    text = text.slice(0, -1);
  }

  return `${text}...`;
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
  const doc = new jsPDF({
    format: "a4",
    orientation: "portrait",
    unit: "pt",
  });

  if (result.kind === "not-configured") {
    return renderFallbackPdf(doc, "Relatório Operacional de Fichas", "Relatório indisponível.");
  }

  if (result.kind === "error") {
    return renderFallbackPdf(doc, "Relatório Operacional de Fichas", result.message);
  }

  const sections = buildDefaultOperationalSections(result.fichas);

  drawPageHeader(doc, {
    filters: formatFilters(filters),
    subtitle: "Visão operacional simples do recorte atual, agrupada por personalização.",
    title: "Relatório Operacional de Fichas",
  });

  drawMetricStrip(doc, buildDefaultOperationalSummaryItems(result.fichas, sections));

  let cursorY = 172;

  if (sections.length === 0) {
    drawEmptyState(doc, cursorY, "Nenhuma ficha encontrada para os filtros atuais.");
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

function buildDefaultOperationalSections(fichas: FichaListItem[]) {
  if (fichas.length === 0) {
    return [];
  }

  const overdueCount = fichas.filter((ficha) => isFichaOverdue(ficha)).length;
  const groups = groupRowsByPersonalizacao(fichas, "upcoming");
  const summaryParts = [
    `${formatNumber(fichas.length)} ficha(s)`,
    `${formatNumber(groups.length)} personalização(ões)`,
  ];

  if (overdueCount > 0) {
    summaryParts.push(`${formatNumber(overdueCount)} atrasada(s)`);
  }

  return [
    {
      groups,
      summary: summaryParts.join(" · "),
      title: "Fichas do recorte",
      tone: overdueCount > 0 ? "danger" : "info",
    } satisfies PdfSection,
  ];
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

function buildDefaultOperationalSummaryItems(fichas: FichaListItem[], sections: PdfSection[]): PdfSummaryItem[] {
  const overdueCount = fichas.filter((ficha) => isFichaOverdue(ficha)).length;

  return [
    { label: "Fichas", tone: "info", value: fichas.length },
    { label: "Atrasadas", tone: overdueCount > 0 ? "danger" : "info", value: overdueCount },
    { label: "Personalizações", tone: "info", value: sections.reduce((total, section) => total + section.groups.length, 0) },
  ];
}

function sanitizePdfText(value: string) {
  return value;
}

function formatShortDate(value: string) {
  return formatDayMonthInput(value);
}

function formatDateTime(value: Date) {
  return formatBusinessDateTime(value);
}

function formatFilters(filters: FichaFilters) {
  const entries = [
    formatPeriodFilter(filters.dataInicio, filters.dataFim),
    filters.busca ? `Busca: ${filters.busca}` : "",
    filters.status ? `Status: ${formatStatusFilter(filters.status)}` : "",
    typeof filters.evento === "boolean" ? `Evento: ${filters.evento ? "sim" : "não"}` : "",
  ].filter(Boolean);

  return entries.length ? entries.join(", ") : "sem filtros";
}

function formatPeriodFilter(dataInicio?: string, dataFim?: string) {
  if (dataInicio && dataFim) {
    return `Período: ${formatDateInputLong(dataInicio)} a ${formatDateInputLong(dataFim)}`;
  }

  if (dataInicio) {
    return `A partir de ${formatDateInputLong(dataInicio)}`;
  }

  if (dataFim) {
    return `Até ${formatDateInputLong(dataFim)}`;
  }

  return "";
}

function formatDateInputLong(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatStatusFilter(status: FichaFilters["status"]) {
  if (status === "atrasado") {
    return "Atrasadas";
  }

  if (status === "pendente") {
    return "Pendentes";
  }

  if (status === "entregue") {
    return "Entregues";
  }

  if (status === "cancelado") {
    return "Canceladas";
  }

  return status ?? "";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
