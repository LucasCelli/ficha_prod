import type { FichaFilters, FichaListItem, FichaListResult, FichaStatus } from "./data";

type PdfGroup = {
  dateLabel: string;
  groups: Array<{
    fichas: FichaListItem[];
    label: string;
  }>;
};

const statusLabels: Record<FichaStatus, string> = {
  cancelado: "Cancelado",
  entregue: "Entregue",
  pendente: "Pendente",
};

export function generateOperationalFichasPdf(result: FichaListResult, filters: FichaFilters) {
  const lines = buildOperationalLines(result, filters);
  return createSimpleTextPdf(lines);
}

function buildOperationalLines(result: FichaListResult, filters: FichaFilters) {
  const lines = [
    "Relatorio operacional de fichas",
    `Gerado em ${formatDateTime(new Date())}`,
    `Filtros: ${formatFilters(filters)}`,
    "",
  ];

  if (result.kind === "not-configured") {
    lines.push("Supabase ainda nao configurado.", "Configure as variaveis de ambiente para carregar dados reais.");
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
        const evento = ficha.evento ? " | Evento" : "";
        lines.push(
          `    ${ficha.cliente_nome_snapshot} | ${venda} | ${statusLabels[ficha.status]} | ${vendedor}${evento}`,
        );
      }
    }

    lines.push("");
  }

  return lines;
}

function groupByDateAndPersonalizacao(fichas: FichaListItem[]): PdfGroup[] {
  const dateGroups = new Map<string, Map<string, FichaListItem[]>>();

  for (const ficha of fichas) {
    const dateLabel = formatDate(ficha.data_entrega);
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
  return stripDiacritics(value).replace(/[^\x20-\x7E]/g, "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizePersonalizacaoLabel(value: string | null) {
  const label = value?.replaceAll("_", " ").trim();
  return label || "Sem tipo definido";
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function formatFilters(filters: FichaFilters) {
  const entries = [
    filters.busca ? `busca=${filters.busca}` : "",
    filters.status ? `status=${filters.status}` : "",
    typeof filters.evento === "boolean" ? `evento=${filters.evento ? "sim" : "nao"}` : "",
    filters.dataInicio ? `inicio=${filters.dataInicio}` : "",
    filters.dataFim ? `fim=${filters.dataFim}` : "",
  ].filter(Boolean);

  return entries.length ? entries.join(", ") : "sem filtros";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
