export const UNIFORM_SIZE_GROUPS = [
  ["RN"],
  ["1"],
  ["2"],
  ["4"],
  ["6"],
  ["PP", "16"],
  ["P"],
  ["M"],
  ["G"],
  ["GG"],
  ["52", "XG", "G1"],
  ["54", "EG", "G2"],
  ["56", "EGG", "EXG", "G3", "XXG", "XGG"],
  ["58", "EEGG", "G4"],
  ["60", "EXGG", "G5", "ESP1"],
  ["62", "XLG", "G6", "ESP2"],
  ["64", "G7", "ESP3"],
] as const;

const UNIFORM_SIZE_ORDER = new Map<string, number>(
  UNIFORM_SIZE_GROUPS.flatMap((sizes, index) => sizes.map((size) => [size, index] as const)),
);

function normalizeUniformText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function normalizeUniformSizeKey(value: string | null | undefined) {
  const normalized = normalizeUniformText(value);
  return normalized
    .replace(/^(?:BL|BABY|BABYLOOK|BABY\s+LOOK|BABY-LOOK)\s*/i, "")
    .replace(/\s+/g, "");
}

export function isUniformBabyLookText(value: string | null | undefined) {
  const normalized = normalizeUniformText(value).replace(/[_-]+/g, " ");
  return /(^|\s)(?:BL|BABY|BABYLOOK|BABY\s+LOOK)(?=\s|$)/.test(normalized);
}

export function getUniformSizeSortParts(value: string | null | undefined) {
  const normalized = normalizeUniformSizeKey(value);
  const explicitOrder = UNIFORM_SIZE_ORDER.get(normalized);
  const numericSize = /^\d+$/.test(normalized) ? Number(normalized) : null;

  if (explicitOrder !== undefined) {
    return {
      order: explicitOrder,
      section: 0,
      text: normalized,
    };
  }

  if (numericSize !== null) {
    return {
      order: numericSize,
      section: 1,
      text: normalized,
    };
  }

  return {
    order: 999,
    section: 2,
    text: normalized,
  };
}

export function compareUniformSizes(first: string | null | undefined, second: string | null | undefined) {
  const left = getUniformSizeSortParts(first);
  const right = getUniformSizeSortParts(second);

  if (left.section !== right.section) return left.section - right.section;
  if (left.order !== right.order) return left.order - right.order;
  return left.text.localeCompare(right.text, "pt-BR", { sensitivity: "base" });
}

function getUniformModelSortBlock(model: string | null | undefined) {
  return model === "baby_look" ? 1 : 0;
}

export function compareUniformSizeAndModel(
  first: { modelo?: string | null; tamanho?: string | null },
  second: { modelo?: string | null; tamanho?: string | null },
) {
  const firstModelBlock = getUniformModelSortBlock(first.modelo);
  const secondModelBlock = getUniformModelSortBlock(second.modelo);

  if (firstModelBlock !== secondModelBlock) return firstModelBlock - secondModelBlock;
  return compareUniformSizes(first.tamanho, second.tamanho);
}

export function compareUniformSizeAndBabyLookText(
  first: { detalhesProduto?: string | null; produto?: string | null; tamanho?: string | null },
  second: { detalhesProduto?: string | null; produto?: string | null; tamanho?: string | null },
) {
  const firstModelBlock = Number(isUniformBabyLookText(`${first.produto ?? ""} ${first.detalhesProduto ?? ""} ${first.tamanho ?? ""}`));
  const secondModelBlock = Number(isUniformBabyLookText(`${second.produto ?? ""} ${second.detalhesProduto ?? ""} ${second.tamanho ?? ""}`));

  if (firstModelBlock !== secondModelBlock) return firstModelBlock - secondModelBlock;
  return compareUniformSizes(first.tamanho, second.tamanho);
}
