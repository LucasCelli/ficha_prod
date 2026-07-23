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
