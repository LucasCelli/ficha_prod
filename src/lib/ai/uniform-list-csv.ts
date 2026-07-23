import type { UniformListItem } from "@/lib/ai/schemas/uniform-list";

const UNIFORM_COREL_CSV_HEADERS = ["tamanho", "nome", "numero", "modelo"] as const;

const MAX_ITEM_QUANTITY = 100;
// Quantidade explicita junto a uma unidade de peca: "2 pecas", "3 camisetas", "2 pcs".
const QUANTITY_WITH_UNIT = /\b(\d{1,3})\s*(?:pe[çc]as?|p[çc]s?|camisetas?|camisas?|blusas?|unidades?)\b/i;
// Multiplicador: "2x" ou "x2".
const QUANTITY_MULTIPLIER = /(?:\b(\d{1,3})\s*x\b|\bx\s*(\d{1,3})\b)/i;

/**
 * Quantidade de pecas que um item representa. Casos como "2 pecas sem nome" descrevem
 * varias pecas em uma unica linha; ao exportar precisamos gerar uma linha por peca.
 */
export function getUniformItemQuantity(item: UniformListItem): number {
  const source = item.observacao ?? "";

  const unitMatch = source.match(QUANTITY_WITH_UNIT);
  const multiplierMatch = source.match(QUANTITY_MULTIPLIER);
  const raw = unitMatch?.[1] ?? multiplierMatch?.[1] ?? multiplierMatch?.[2];

  if (!raw) return 1;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 1) return 1;
  return Math.min(value, MAX_ITEM_QUANTITY);
}

/** Expande itens que representam multiplas pecas em uma peca por item. */
export function expandUniformItemsByQuantity(items: UniformListItem[]): UniformListItem[] {
  return items.flatMap((item) => Array.from({ length: getUniformItemQuantity(item) }, () => item));
}

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

export function buildUniformCorelCsvFilename(clienteNome: string | null | undefined, grupo?: string | null) {
  const groupSuffix = grupo?.trim() ? `_${toSnakeCaseSegment(grupo)}` : "";
  return `lista_${toSnakeCaseSegment(clienteNome)}${groupSuffix}.csv`;
}

export function buildUniformCorelCsv(items: UniformListItem[]) {
  const rows = [
    UNIFORM_COREL_CSV_HEADERS,
    ...expandUniformItemsByQuantity(items).map(
      (item) => [item.tamanho ?? "", item.nome ?? "", item.numero ?? "", item.modelo] as const,
    ),
  ];

  return `\uFEFF${rows.map((row) => row.map(formatCsvValue).join(";")).join("\r\n")}\r\n`;
}
