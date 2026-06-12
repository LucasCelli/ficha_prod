import type { UniformListItem } from "@/lib/ai/schemas/uniform-list";

const UNIFORM_COREL_CSV_HEADERS = ["tamanho", "nome", "numero", "modelo"] as const;

function toSnakeCaseSegment(value: string | null | undefined) {
  return (
    value
      ?.trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "cliente"
  );
}

function formatCsvValue(value: string | null | undefined) {
  const text = value ?? "";
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildUniformCorelCsvFilename(clienteNome: string | null | undefined) {
  return `lista_${toSnakeCaseSegment(clienteNome)}.csv`;
}

export function buildUniformCorelCsv(items: UniformListItem[]) {
  const rows = [
    UNIFORM_COREL_CSV_HEADERS,
    ...items.map((item) => [item.tamanho ?? "", item.nome ?? "", item.numero ?? "", item.modelo] as const),
  ];

  return `\uFEFF${rows.map((row) => row.map(formatCsvValue).join(";")).join("\r\n")}\r\n`;
}
