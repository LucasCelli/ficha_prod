import type { UniformList, UniformListItem } from "./schemas/uniform-list.ts";
import { DEFAULT_UNIFORM_SIZE_DEFINITIONS } from "../uniform-sizes.ts";

const VERTICAL_SIZES = new Set(
  DEFAULT_UNIFORM_SIZE_DEFINITIONS.flatMap((definition) => [definition.name, ...definition.aliases]).map((size) => size.toLocaleUpperCase("pt-BR")),
);

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function scalarText(value: unknown) {
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text || null;
  }

  return null;
}

function readField(record: Record<string, unknown>, ...aliases: string[]) {
  const wanted = new Set(aliases.map(normalizeKey));
  const entry = Object.entries(record).find(([key]) => wanted.has(normalizeKey(key)));
  return scalarText(entry?.[1]);
}

function normalizeName(value: string | null) {
  if (!value || /^(?:sem nomes?|s\s*\/\s*nome|sem identifica(?:cao|ção)|sem id)$/iu.test(value)) return null;
  return value;
}

function normalizeModel(value: string | null): UniformListItem["modelo"] {
  const normalized = normalizeKey(value ?? "").replace(/[_-]+/gu, " ");
  if (/^(?:baby\s*look|baby|bl|feminina?|modelo feminino)$/u.test(normalized)) return "baby_look";
  if (normalized === "regata") return "regata";
  if (normalized === "polo") return "polo";
  if (normalized === "infantil") return "infantil";
  if (!normalized || /^(?:tradicional|camisa|camiseta)$/u.test(normalized)) return "tradicional";
  return "desconhecido";
}

function normalizeRecord(record: Record<string, unknown>): UniformListItem {
  const name = normalizeName(readField(record, "nome", "name"));
  const size = readField(record, "tamanho", "tam", "tm", "size");

  return {
    grupo: readField(record, "grupo", "group"),
    nome: name,
    numero: readField(record, "numero", "número", "num", "number"),
    tamanho: size?.toLocaleUpperCase("pt-BR") ?? null,
    modelo: normalizeModel(readField(record, "modelo", "model")),
    confianca: "alta",
    observacao: null,
  };
}

/**
 * Parses already-structured customer input without asking the model to
 * reinterpret it. This preserves the exact object count and prevents a model
 * from copying a size or duplicating a neighboring row.
 */
export function parseStructuredUniformListInput(text: string): UniformList | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  const records = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items
      : null;

  if (!records || !records.every((record) => record !== null && typeof record === "object" && !Array.isArray(record))) {
    return null;
  }

  return { items: records.map((record) => normalizeRecord(record as Record<string, unknown>)) };
}

/** Parses the common `size -> names -> next size -> names` layout exactly. */
export function parseVerticalUniformListInput(text: string): UniformList | null {
  const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const items: UniformListItem[] = [];
  let activeSize: string | null = null;
  let activeGroup: string | null = null;
  let foundSizeHeading = false;

  for (const line of lines) {
    const upper = line.toLocaleUpperCase("pt-BR");

    if (VERTICAL_SIZES.has(upper)) {
      activeSize = upper;
      foundSizeHeading = true;
      continue;
    }

    if (/:\s*$/u.test(line)) {
      // Complex size/model headings and nameless sections still go through the AI path.
      const heading = line.replace(/:\s*$/u, "").trim();
      if (VERTICAL_SIZES.has(heading.toLocaleUpperCase("pt-BR")) || normalizeName(heading) === null) return null;
      activeGroup = heading;
      continue;
    }

    if (!activeSize) return null;

    // A mixed horizontal row needs the full parser rather than this strict layout.
    const lastToken = upper.split(/\s+/u).at(-1) ?? "";
    if (line.includes("-") || line.includes(";") || line.includes("|") || (VERTICAL_SIZES.has(lastToken) && upper !== lastToken)) {
      return null;
    }

    items.push({
      grupo: activeGroup,
      nome: normalizeName(line),
      numero: null,
      tamanho: activeSize,
      modelo: "tradicional",
      confianca: "alta",
      observacao: null,
    });
  }

  return foundSizeHeading && items.length > 0 ? { items } : null;
}
