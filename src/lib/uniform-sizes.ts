export type UniformSizeVariantId = "traditional" | "baby-look" | "unknown";
export type UniformSizeDefinition = { active: boolean; aliases: readonly string[]; id: string; name: string; order: number };
export type ResolvedUniformSize = { definition: UniformSizeDefinition | null; normalizedInput: string; sizeId: string | null; variantId: UniformSizeVariantId };

const CANONICAL_SIZE_SEED = [
  ["size_rn", "RN", []], ["size_1", "1", []], ["size_2", "2", []], ["size_4", "4", []],
  ["size_6", "6", []], ["size_8", "8", []], ["size_10", "10", []], ["size_12", "12", []],
  ["size_14", "14", []], ["size_pp", "PP", ["16"]], ["size_p", "P", ["18"]], ["size_m", "M", []],
  ["size_g", "G", []], ["size_gg", "GG", []], ["size_xg", "XG", ["52", "G1"]],
  ["size_eg", "EG", ["54", "XGG", "G2"]], ["size_egg", "EGG", ["56", "XXG", "G3"]],
  ["size_eegg", "EEGG", ["58", "XXGG", "G4"]], ["size_60", "60", ["XLG", "ESP1", "G5"]],
  ["size_62", "62", ["XLGG", "ESP2", "G6"]], ["size_64", "64", ["XLGGG", "ESP3", "G7"]],
] as const;

export const DEFAULT_UNIFORM_SIZE_DEFINITIONS: readonly UniformSizeDefinition[] = CANONICAL_SIZE_SEED.map(
  ([id, name, aliases], order) => ({ active: true, aliases, id, name, order }),
);
const VARIANT_PREFIX = /^(?:BABY\s+LOOK|BABY-LOOK|BABYLOOK|BABY|BL)(?=\s|$)\s*/i;
const LEGACY_MODEL_PREFIX = /^(?:FEMININA|MASCULINA|MASCULINO|MASC|FEM)(?=\s|$)\s*/i;

export function normalizeSizeInput(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
}

function presentationCandidates(value: string) {
  const match = value.match(/^(.+?)\s*\(([^()]+)\)$/);
  return match ? [match[1].trim(), match[2].trim()] : [value];
}

export function validateSizeConfiguration(definitions: readonly UniformSizeDefinition[]) {
  const errors: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  const aliases = new Map<string, string>();
  for (const definition of definitions) {
    const name = normalizeSizeInput(definition.name);
    if (!definition.id.trim() || ids.has(definition.id)) errors.push(`ID duplicado ou vazio: ${definition.id || "(vazio)"}.`);
    if (!name || names.has(name)) errors.push(`Nome canônico duplicado ou vazio: ${definition.name || "(vazio)"}.`);
    if (!Number.isInteger(definition.order) || definition.order < 0) errors.push(`Ordem inválida para ${definition.name}.`);
    ids.add(definition.id); names.add(name);
    for (const rawAlias of [definition.name, ...definition.aliases]) {
      const alias = normalizeSizeInput(rawAlias);
      const owner = aliases.get(alias);
      if (owner && owner !== definition.id) errors.push(`Alias ${rawAlias} pertence a mais de um tamanho.`);
      else if (alias) aliases.set(alias, definition.id);
    }
  }
  return errors;
}

export function createUniformSizeDomain(definitions: readonly UniformSizeDefinition[] = DEFAULT_UNIFORM_SIZE_DEFINITIONS) {
  const ordered = [...definitions].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
  const byAlias = new Map<string, UniformSizeDefinition>();
  for (const definition of ordered) for (const alias of [definition.name, ...definition.aliases]) byAlias.set(normalizeSizeInput(alias), definition);

  function resolveSize(input: string | null | undefined, explicitVariant?: UniformSizeVariantId): ResolvedUniformSize {
    let normalizedInput = normalizeSizeInput(input);
    const variantId = explicitVariant ?? (VARIANT_PREFIX.test(normalizedInput) ? "baby-look" : "traditional");
    normalizedInput = normalizedInput.replace(VARIANT_PREFIX, "").replace(LEGACY_MODEL_PREFIX, "").trim();
    const definition = presentationCandidates(normalizedInput).map((candidate) => byAlias.get(normalizeSizeInput(candidate))).find(Boolean) ?? null;
    return { definition, normalizedInput, sizeId: definition?.id ?? null, variantId: definition ? variantId : "unknown" };
  }

  function compareSizes(first: string | null | undefined, second: string | null | undefined) {
    const left = resolveSize(first); const right = resolveSize(second);
    if (Boolean(left.definition) !== Boolean(right.definition)) return left.definition ? -1 : 1;
    if (left.definition && right.definition && left.definition.order !== right.definition.order) return left.definition.order - right.definition.order;
    const leftKey = left.sizeId ?? left.normalizedInput; const rightKey = right.sizeId ?? right.normalizedInput;
    return leftKey === rightKey ? 0 : leftKey < rightKey ? -1 : 1;
  }

  return {
    compareSizes,
    formatSizeLabel(input: string | null | undefined, includePrimaryAlias = false) {
      const resolved = resolveSize(input);
      if (!resolved.definition) return normalizeSizeInput(input);
      const alias = includePrimaryAlias ? resolved.definition.aliases[0] : undefined;
      return `${resolved.variantId === "baby-look" ? "BL " : ""}${resolved.definition.name}${alias ? ` (${alias})` : ""}`;
    },
    isSameSize(first: string | null | undefined, second: string | null | undefined) {
      const left = resolveSize(first); const right = resolveSize(second);
      return Boolean(left.sizeId && left.sizeId === right.sizeId && left.variantId === right.variantId);
    },
    resolveSize,
    sortSizes<T extends string>(values: readonly T[]) { return [...values].sort(compareSizes); },
  };
}

const defaultDomain = createUniformSizeDomain();
export const normalizeUniformSizeKey = (value: string | null | undefined) => defaultDomain.resolveSize(value).definition?.name ?? defaultDomain.resolveSize(value).normalizedInput.replace(/\s+/g, "");
export const isUniformBabyLookText = (value: string | null | undefined) => /(^|\s)(?:BL|BABY|BABYLOOK|BABY\s+LOOK|FEM|FEMININA)(?=\s|$)/.test(normalizeSizeInput(value).replace(/[_-]+/g, " "));
export const compareUniformSizes = defaultDomain.compareSizes;
function modelVariant(model: string | null | undefined): UniformSizeVariantId { return model === "baby_look" ? "baby-look" : "traditional"; }

export function compareUniformSizeAndModel(first: { modelo?: string | null; tamanho?: string | null }, second: { modelo?: string | null; tamanho?: string | null }, definitions?: readonly UniformSizeDefinition[]) {
  const domain = definitions ? createUniformSizeDomain(definitions) : defaultDomain;
  const firstVariant = modelVariant(first.modelo); const secondVariant = modelVariant(second.modelo);
  if (firstVariant !== secondVariant) return firstVariant === "traditional" ? -1 : 1;
  return domain.compareSizes(first.tamanho, second.tamanho);
}

export function compareUniformSizeAndBabyLookText(first: { detalhesProduto?: string | null; produto?: string | null; tamanho?: string | null }, second: { detalhesProduto?: string | null; produto?: string | null; tamanho?: string | null }, definitions?: readonly UniformSizeDefinition[]) {
  const domain = definitions ? createUniformSizeDomain(definitions) : defaultDomain;
  const firstBaby = isUniformBabyLookText(`${first.produto ?? ""} ${first.detalhesProduto ?? ""} ${first.tamanho ?? ""}`);
  const secondBaby = isUniformBabyLookText(`${second.produto ?? ""} ${second.detalhesProduto ?? ""} ${second.tamanho ?? ""}`);
  if (firstBaby !== secondBaby) return firstBaby ? 1 : -1;
  return domain.compareSizes(first.tamanho, second.tamanho);
}
