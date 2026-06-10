import type { UniformListItem } from "@/lib/ai/schemas/uniform-list";

const NAME_NUMBER_CSV_HEADERS = ["Nome", "Número"] as const;

function formatCsvValue(value: string | null | undefined) {
  const text = value ?? "";
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildUniformNameNumberCsv(items: UniformListItem[]) {
  const rows = [
    NAME_NUMBER_CSV_HEADERS,
    ...items.map((item) => [item.nome ?? "", item.numero ?? ""] as const),
  ];

  return `\uFEFF${rows.map((row) => row.map(formatCsvValue).join(",")).join("\r\n")}\r\n`;
}
