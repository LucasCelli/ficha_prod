import {
  adultUniformSizes,
  childUniformSizes,
  type UniformList,
  type UniformListItem,
} from "@/lib/ai/schemas/uniform-list";

const UNIFORM_SIZES = new Set<string>([...adultUniformSizes, ...childUniformSizes]);

const MODEL_PATTERNS: Array<{ model: UniformListItem["modelo"]; pattern: RegExp }> = [
  { model: "baby_look", pattern: /\b(?:baby[\s_-]*look|babylook|baby|bl)\b/giu },
  { model: "regata", pattern: /\bregata\b/giu },
  { model: "polo", pattern: /\bpolo\b/giu },
  { model: "tradicional", pattern: /\b(?:camiseta|camisa|tradicional)\b/giu },
];

function cleanGroup(value: string) {
  return value
    .replace(/^[\s:;,|/\\-]+|[\s:;,|/\\-]+$/gu, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

function extractSize(value: string) {
  const tokens = value.match(/[A-Z0-9]+/giu) ?? [];
  return tokens.map((token) => token.toUpperCase()).find((token) => UNIFORM_SIZES.has(token)) ?? null;
}

type SectionDefaults = {
  model: UniformListItem["modelo"];
  size: string;
};

function normalizeLine(value: string) {
  return value.trim().replace(/\s+/gu, " ").toLocaleUpperCase("pt-BR");
}

function parseSectionHeading(line: string): SectionDefaults | null {
  const heading = line.trim().replace(/:\s*$/u, "");
  const size = extractSize(heading);
  if (!size) return null;

  let remaining = heading.replace(new RegExp(`\\b${size}\\b`, "giu"), " ");
  let model: UniformListItem["modelo"] = "tradicional";

  for (const entry of MODEL_PATTERNS) {
    entry.pattern.lastIndex = 0;
    if (!entry.pattern.test(remaining)) continue;
    model = entry.model;
    entry.pattern.lastIndex = 0;
    remaining = remaining.replace(entry.pattern, " ");
  }

  return cleanGroup(remaining) ? null : { model, size };
}

/**
 * Restores section defaults directly from the source text. This prevents a
 * standalone heading such as `XG` from being attached to the previous person.
 */
export function applyUniformListSourceSections(list: UniformList, sourceText: string): UniformList {
  const defaultsByName = new Map<string, SectionDefaults>();
  const sectionSizes = new Set<string>();
  const hasNamelessSection = /(?:^|\n)\s*(?:SEM NOMES?|S\s*\/\s*NOME)\s*:?(?:\n|$)/iu.test(sourceText);
  let activeDefaults: SectionDefaults | null = null;

  for (const rawLine of sourceText.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = parseSectionHeading(line);
    if (heading) {
      sectionSizes.add(heading.size);
      activeDefaults = heading;
      continue;
    }

    if (activeDefaults) defaultsByName.set(normalizeLine(line), activeDefaults);
  }

  return {
    items: list.items
      .filter(
        (item) =>
          hasNamelessSection ||
          item.nome ||
          item.numero ||
          !item.tamanho ||
          !sectionSizes.has(item.tamanho.toUpperCase()),
      )
      .map((item) => {
        if (!item.nome) return item;
        const defaults = defaultsByName.get(normalizeLine(item.nome));
        if (!defaults) return item;

        return { ...item, modelo: defaults.model, tamanho: defaults.size };
      }),
  };
}
/**
 * Model and size headings define item attributes. Only a remaining specific
 * classification, such as a color, is allowed to stay in `grupo`.
 */
export function normalizeUniformListGroups(list: UniformList): UniformList {
  return {
    items: list.items.map((item) => {
      const originalGroup = item.grupo?.trim();
      if (!originalGroup) return item;

      let remainingGroup = originalGroup;
      let inheritedModel: UniformListItem["modelo"] | null = null;

      for (const entry of MODEL_PATTERNS) {
        entry.pattern.lastIndex = 0;
        if (!entry.pattern.test(remainingGroup)) continue;
        inheritedModel ??= entry.model;
        entry.pattern.lastIndex = 0;
        remainingGroup = remainingGroup.replace(entry.pattern, " ");
      }

      const inheritedSize = extractSize(remainingGroup);
      if (inheritedSize) {
        remainingGroup = remainingGroup.replace(new RegExp(`\\b${inheritedSize}\\b`, "giu"), " ");
      }

      const normalizedGroup = cleanGroup(remainingGroup);

      return {
        ...item,
        grupo: normalizedGroup || null,
        modelo:
          inheritedModel && (item.modelo === "tradicional" || item.modelo === "desconhecido")
            ? inheritedModel
            : item.modelo,
        tamanho: item.tamanho || inheritedSize,
      };
    }),
  };
}
