import legacyCatalog from "./data/legacy-catalog-fallback.json";
import type { CatalogOptionsByKind } from "@/features/catalogos/data";
import type { FichaFormInitialData, ImageFormItem, ProductFormItem } from "./ficha-form-seed";
import { createEmptyFichaFormInitialData, createEmptyProductItem } from "./ficha-form-seed";
import { LEGACY_FICHA_PARITY_AUDIT } from "./legacy-import-audit";

export type LegacyFichaImportWarningCode =
  | "backup_multiple_fichas"
  | "backup_without_fichas"
  | "images_invalid"
  | "images_preview_only";

export type LegacyFichaImportWarning = {
  code: LegacyFichaImportWarningCode;
  field?: string;
  message: string;
};

type LegacyImportedImageDraft = {
  altText: string;
  bytes?: number;
  height?: number;
  id: string;
  kind: "preview-only" | "saveable";
  publicId?: string;
  secureUrl: string;
  width?: number;
};

export type ImportedLegacyFichaDraft = {
  acabamentoGola: string;
  acabamentoManga: string;
  aberturaLateral: string;
  arte: string;
  bolso: string;
  cliente: string;
  clienteAuxiliar: string;
  comNomes: string;
  composicao: string;
  corAberturaLateral: string;
  corAcabamentoManga: string;
  corBotao: string;
  corGola: string;
  corMaterial: string;
  corPeDeGolaExterno: string;
  corPeDeGolaInterno: string;
  corPeitilhoExterno: string;
  corPeitilhoInterno: string;
  corReforco: string;
  corSublimacao: string;
  dataEntrega: string;
  dataInicio: string;
  evento: boolean;
  faixa: string;
  faixaCor: string;
  faixaLocal: string;
  filete: string;
  fileteCor: string;
  fileteLocal: string;
  gola: string;
  imagens: LegacyImportedImageDraft[];
  itens: ProductFormItem[];
  larguraGola: string;
  larguraManga: string;
  manga: string;
  material: string;
  numeroVenda: string;
  observacoes: string;
  reforcoGola: string;
  vendedor: string;
};

const LEGACY_VALUE_ALIASES = {
  acabamentoGola: {
    ribana: "Ribana",
    ribana_molde: "Ribana em Molde",
    ribana_sublimada: "Ribana Sublimada",
    vies: "Viés",
    vies_sublimado: "Viés Sublimado",
  },
  acabamentoManga: {
    barra: "Barra",
    punho: "Punho",
    punho_ribana: "Punho de Ribana",
    punho_vies_sublimado: "Punho Sublimado",
    vies: "Viés",
    vies_sublimado: "Viés Sublimado",
  },
  gola: {
    canoa: "Gola Canoa",
    padre_esportiva: "Gola Padre Esportiva",
    padre_ziper: "Gola Padre com Zíper",
    polo: "Gola Polo",
    redonda: "Gola Redonda",
    social: "Gola Social",
    v: "Gola V",
    v_polo: "Gola V Polo",
  },
} as const;

const LEGACY_FALLBACK_LOOKUPS = {
  cor: buildCatalogLookup([
    ...legacyCatalog.cores,
    ...legacyCatalog.coresBotao,
  ]),
  faixaCor: buildCatalogLookup(legacyCatalog.faixaCor),
  faixaLocal: buildCatalogLookup(legacyCatalog.faixaLocal),
  fileteLocal: buildCatalogLookup(legacyCatalog.fileteLocal),
  largura: buildCatalogLookup(legacyCatalog.larguras),
  manga: buildCatalogLookup(legacyCatalog.mangas),
  material: buildCatalogLookup(legacyCatalog.materiais.map((item) => item.nome), legacyCatalog.materiais.map((item) => [item.id, item.nome] as const)),
  produto: buildCatalogLookup(legacyCatalog.produtos),
  tamanho: buildCatalogLookup(legacyCatalog.tamanhos),
};

export function parseLegacyFichaJson(input: unknown, catalogOptions?: CatalogOptionsByKind) {
  const ficha = extractFichaPayload(input);
  const warnings: LegacyFichaImportWarning[] = [];
  const catalogLookups = buildCatalogLookupsFromOptions(catalogOptions);
  const draft: ImportedLegacyFichaDraft = {
    acabamentoGola: normalizeLegacyFieldValue("acabamentoGola", readText(ficha, "acabamentoGola", "acabamento_gola"), catalogLookups),
    acabamentoManga: normalizeLegacyFieldValue("acabamentoManga", readText(ficha, "acabamentoManga", "acabamento_manga"), catalogLookups),
    aberturaLateral: readText(ficha, "aberturaLateral", "abertura_lateral", "abertura") || "nao",
    arte: readText(ficha, "arte"),
    bolso: readText(ficha, "bolso"),
    cliente: readText(ficha, "cliente"),
    clienteAuxiliar: readText(ficha, "clienteAuxiliar", "cliente_auxiliar"),
    comNomes: resolveComNomesValue(ficha),
    composicao: readText(ficha, "composicao"),
    corAberturaLateral: normalizeLegacyFieldValue("cor", readText(ficha, "corAberturaLateral", "cor_abertura_lateral"), catalogLookups),
    corAcabamentoManga: normalizeLegacyFieldValue("cor", readText(ficha, "corAcabamentoManga", "cor_acabamento_manga"), catalogLookups),
    corBotao: normalizeLegacyFieldValue("cor", readText(ficha, "corBotao", "cor_botao"), catalogLookups),
    corGola: normalizeLegacyFieldValue("cor", readText(ficha, "corGola", "cor_gola"), catalogLookups),
    corMaterial: normalizeLegacyFieldValue("cor", readText(ficha, "corMaterial", "cor_material"), catalogLookups),
    corPeDeGolaExterno: normalizeLegacyFieldValue("cor", readText(ficha, "corPeDeGolaExterno", "cor_pe_de_gola_externo"), catalogLookups),
    corPeDeGolaInterno: normalizeLegacyFieldValue("cor", readText(ficha, "corPeDeGolaInterno", "cor_pe_de_gola_interno"), catalogLookups),
    corPeitilhoExterno: normalizeLegacyFieldValue("cor", readText(ficha, "corPeitilhoExterno", "cor_peitilho_externo"), catalogLookups),
    corPeitilhoInterno: normalizeLegacyFieldValue("cor", readText(ficha, "corPeitilhoInterno", "cor_peitilho_interno"), catalogLookups),
    corReforco: normalizeLegacyFieldValue("cor", readText(ficha, "corReforco", "cor_reforco"), catalogLookups),
    corSublimacao: normalizeLegacyFieldValue("cor", readText(ficha, "corSublimacao", "cor_sublimacao"), catalogLookups),
    dataEntrega: normalizeDate(readText(ficha, "dataEntrega", "data_entrega")),
    dataInicio: normalizeDate(readText(ficha, "dataInicio", "data_inicio")),
    evento: readBoolean(ficha, "evento"),
    faixa: readText(ficha, "faixa") || "nao",
    faixaCor: normalizeLegacyFieldValue("faixaCor", readText(ficha, "faixaCor", "faixa_cor"), catalogLookups),
    faixaLocal: normalizeLegacyFieldValue("faixaLocal", readText(ficha, "faixaLocal", "faixa_local"), catalogLookups),
    filete: readText(ficha, "filete") || "nao",
    fileteCor: normalizeLegacyFieldValue("cor", readText(ficha, "fileteCor", "filete_cor"), catalogLookups),
    fileteLocal: normalizeLegacyFieldValue("fileteLocal", readText(ficha, "fileteLocal", "filete_local"), catalogLookups),
    gola: normalizeLegacyFieldValue("gola", readText(ficha, "gola"), catalogLookups),
    imagens: parseLegacyImages(ficha, warnings),
    itens: parseLegacyItems(ficha, catalogLookups),
    larguraGola: normalizeLegacyFieldValue("largura", readText(ficha, "larguraGola", "largura_gola"), catalogLookups),
    larguraManga: normalizeLegacyFieldValue("largura", readText(ficha, "larguraManga", "largura_manga"), catalogLookups),
    manga: normalizeLegacyFieldValue("manga", readText(ficha, "manga"), catalogLookups),
    material: normalizeLegacyFieldValue("material", readText(ficha, "material"), catalogLookups),
    numeroVenda: readText(ficha, "numeroVenda", "numero_venda"),
    observacoes: resolveObservacoesValue(ficha),
    reforcoGola: readText(ficha, "reforcoGola", "reforco_gola") || "nao",
    vendedor: readText(ficha, "vendedor"),
  };

  return {
    audit: LEGACY_FICHA_PARITY_AUDIT,
    draft,
    warnings,
  };
}

export function mapLegacyDraftToFichaFormInitialData(draft: ImportedLegacyFichaDraft): FichaFormInitialData {
  const initial = createEmptyFichaFormInitialData();

  return {
    ...initial,
    ...draft,
    imagens: draft.imagens.map(mapLegacyImageToFormItem),
    itens: draft.itens.length ? draft.itens : [createEmptyProductItem()],
  };
}

function extractFichaPayload(input: unknown) {
  if (!isRecord(input)) {
    throw new Error("JSON inválido. Envie um objeto de ficha ou um backup com exatamente uma ficha.");
  }

  const fichas = readArray(input, "fichas");
  if (fichas) {
    if (fichas.length === 0) {
      throw new Error("O backup legado não contém fichas para importar.");
    }

    if (fichas.length > 1) {
      throw new Error("Este importador aceita apenas uma ficha por vez. Exporte ou isole uma única ficha no JSON.");
    }

    const [singleFicha] = fichas;
    if (!isRecord(singleFicha)) {
      throw new Error("A ficha encontrada no backup não possui um formato válido.");
    }
    return singleFicha;
  }

  return input;
}

function parseLegacyItems(
  ficha: Record<string, unknown>,
  catalogLookups: Partial<Record<LegacyFieldLookupKey, Map<string, string>>>,
): ProductFormItem[] {
  const rawItems = readArray(ficha, "produtos") ?? readArray(ficha, "itens") ?? readArray(ficha, "itens_json") ?? [];
  if (!rawItems.length) return [createEmptyProductItem()];

  const items = rawItems
    .map((item, index) => {
      if (!isRecord(item)) return null;

      const produto = normalizeLegacyFieldValue("produto", readText(item, "produto", "descricao"), catalogLookups);
      const detalhesProduto = readText(item, "detalhesProduto", "detalhes", "detalhes_produto");
      const quantidade = readText(item, "quantidade") || "1";
      const tamanho = normalizeLegacyFieldValue("tamanho", readText(item, "tamanho"), catalogLookups);

      if (!produto && !detalhesProduto && !tamanho && !quantidade) return null;

      return {
        detalhesProduto,
        id: `legacy-item-${index}-${produto || "vazio"}`,
        produto,
        quantidade,
        tamanho,
      };
    })
    .filter((item): item is ProductFormItem => Boolean(item));

  return items.length ? items : [createEmptyProductItem()];
}

function parseLegacyImages(ficha: Record<string, unknown>, warnings: LegacyFichaImportWarning[]): LegacyImportedImageDraft[] {
  const images: LegacyImportedImageDraft[] = [];
  const rawCollection = parseLegacyImageCollection(ficha);

  rawCollection.forEach((entry, index) => {
    if (!isRecord(entry)) {
      warnings.push({
        code: "images_invalid",
        field: "imagens",
        message: `Imagem ${index + 1} do legado foi ignorada porque não possui estrutura compatível.`,
      });
      return;
    }

    const secureUrl = readText(entry, "secureUrl", "secure_url", "url", "src");
    const publicId = readText(entry, "publicId", "public_id");
    const altText = readText(entry, "altText", "alt_text", "descricao", "descricaoImagem");
    const id = publicId || `legacy-image-${index}`;
    const bytes = readOptionalNumber(entry, "bytes");
    const height = readOptionalNumber(entry, "height");
    const width = readOptionalNumber(entry, "width");

    if (!secureUrl) {
      warnings.push({
        code: "images_invalid",
        field: "imagens",
        message: `Imagem ${index + 1} do legado foi ignorada porque não possui URL utilizável.`,
      });
      return;
    }

    if (secureUrl.startsWith("data:") || secureUrl.startsWith("blob:")) {
      warnings.push({
        code: "images_invalid",
        field: "imagens",
        message: `Imagem ${index + 1} foi ignorada porque está em base64/blob e não pode ser persistida no contrato atual.`,
      });
      return;
    }

    if (!isHttpUrl(secureUrl)) {
      warnings.push({
        code: "images_invalid",
        field: "imagens",
        message: `Imagem ${index + 1} foi ignorada porque a URL não é HTTP(S).`,
      });
      return;
    }

    if (publicId) {
      images.push({
        altText,
        bytes,
        height,
        id,
        kind: "saveable",
        publicId,
        secureUrl,
        width,
      });
      return;
    }

    warnings.push({
      code: "images_preview_only",
      field: "imagens",
      message: `Imagem ${index + 1} foi importada só como rascunho porque não possui publicId para salvar no contrato atual.`,
    });
    images.push({
      altText,
      bytes,
      height,
      id,
      kind: "preview-only",
      secureUrl,
      width,
    });
  });

  return images.slice(0, 4);
}

function parseLegacyImageCollection(ficha: Record<string, unknown>) {
  const imagensData = readUnknown(ficha, "imagensData", "imagens_data");
  const parsedImages = parseUnknownArray(imagensData);
  if (parsedImages.length) return parsedImages;

  const imagemData = readText(ficha, "imagemData", "imagem_data");
  if (imagemData) {
    return [{ src: imagemData }];
  }

  return [];
}

function mapLegacyImageToFormItem(image: LegacyImportedImageDraft): ImageFormItem {
  if (image.kind === "saveable") {
    return {
      altText: image.altText,
      bytes: image.bytes,
      height: image.height,
      id: image.id,
      importMode: "legacy-saveable",
      persisted: true,
      publicId: image.publicId,
      secureUrl: image.secureUrl,
      width: image.width,
    };
  }

  return {
    altText: image.altText,
    bytes: image.bytes,
    height: image.height,
    id: image.id,
    importMode: "legacy-preview-only",
    importWarning: "Imagem importada apenas como rascunho. Remova ou substitua antes de salvar.",
    previewUrl: image.secureUrl,
    saveBlocked: true,
    secureUrl: image.secureUrl,
    width: image.width,
  };
}

function resolveObservacoesValue(ficha: Record<string, unknown>) {
  return readText(ficha, "observacoesHtml", "observacoes_html", "observacoes", "observacoesPlainText", "observacoes_plain_text");
}

type LegacyFieldLookupKey =
  | "acabamentoGola"
  | "acabamentoManga"
  | "cor"
  | "faixaCor"
  | "faixaLocal"
  | "fileteLocal"
  | "gola"
  | "largura"
  | "manga"
  | "material"
  | "produto"
  | "tamanho";

function normalizeLegacyFieldValue(
  field: LegacyFieldLookupKey,
  value: string,
  catalogLookups: Partial<Record<LegacyFieldLookupKey, Map<string, string>>>,
) {
  if (!value) return "";

  const aliasMap = field in LEGACY_VALUE_ALIASES
    ? LEGACY_VALUE_ALIASES[field as keyof typeof LEGACY_VALUE_ALIASES]
    : null;
  const normalizedValue = normalizeText(value)
    .replace(/[\s/]+/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const aliasMatch = aliasMap?.[normalizedValue as keyof typeof aliasMap];
  if (aliasMatch) return aliasMatch;

  const lookup = catalogLookups[field] ?? LEGACY_FALLBACK_LOOKUPS[field as keyof typeof LEGACY_FALLBACK_LOOKUPS];
  if (lookup) {
    if (lookup.has(normalizedValue)) {
      return lookup.get(normalizedValue) ?? value;
    }
  }

  return looksLikeLegacyToken(value) ? humanizeLegacyToken(value) : value;
}

function buildCatalogLookupsFromOptions(catalogOptions?: CatalogOptionsByKind): Partial<Record<LegacyFieldLookupKey, Map<string, string>>> {
  if (!catalogOptions) return {};

  return {
    acabamentoGola: buildOptionsLookup(catalogOptions.acabamento_gola),
    acabamentoManga: buildOptionsLookup(catalogOptions.acabamento_manga),
    cor: buildOptionsLookup(catalogOptions.cor),
    gola: buildOptionsLookup(catalogOptions.gola),
    manga: buildOptionsLookup(catalogOptions.manga),
    material: buildOptionsLookup(catalogOptions.tecido),
    produto: buildOptionsLookup(catalogOptions.produto),
    tamanho: buildOptionsLookup(catalogOptions.tamanho),
  };
}

function buildOptionsLookup(options: Array<{ aliases?: string[]; label: string; value?: string }>) {
  const lookup = new Map<string, string>();

  options.forEach((option) => {
    const canonical = (option.value ?? option.label).trim();
    if (!canonical) return;

    const candidates = [option.label, option.value, ...(option.aliases ?? [])].filter((value): value is string => Boolean(value?.trim()));
    candidates.forEach((candidate) => {
      lookup.set(normalizeLookupToken(candidate), canonical);
    });
  });

  return lookup;
}

function resolveComNomesValue(ficha: Record<string, unknown>) {
  const explicitValue = readUnknown(ficha, "comNomes", "com_nomes");
  const normalized = normalizeComNomesValue(explicitValue);
  if (normalized !== "0") return normalized;
  return detectComNomesByText(resolveObservacoesValue(ficha));
}

function normalizeComNomesValue(value: unknown) {
  if (value === false || value === null || value === undefined) return "0";
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.max(0, Math.min(3, value)));

  const text = String(value).trim().toLowerCase();
  if (!text) return "0";
  if (["0", "nao", "não", "nenhum", "false"].includes(text)) return "0";
  if (["1", "com nomes", "nomes"].includes(text)) return "1";
  if (["2", "com nomes e numeros", "com nomes e números", "nomes e numeros", "nomes e números"].includes(text)) return "2";
  if (["3", "somente numeros", "somente números", "numeros", "números"].includes(text)) return "3";
  return "0";
}

function detectComNomesByText(text: string) {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return "0";
  if (normalizedText.includes("com nomes e numeros")) return "2";
  if (normalizedText.includes("somente numeros")) return "3";
  if (normalizedText.includes("com nomes")) return "1";
  return "0";
}

function normalizeDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function readOptionalNumber(record: Record<string, unknown>, key: string) {
  const rawValue = record[key];
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) return rawValue;
  if (typeof rawValue === "string" && rawValue.trim()) {
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readBoolean(record: Record<string, unknown>, key: string) {
  const rawValue = record[key];
  if (typeof rawValue === "boolean") return rawValue;
  const text = String(rawValue ?? "").trim().toLowerCase();
  return ["1", "true", "sim", "on"].includes(text);
}

function readText(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const rawValue = record[key];
    if (rawValue === null || rawValue === undefined) continue;
    const text = String(rawValue).trim();
    if (text) return text;
  }
  return "";
}

function readUnknown(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

function readArray(record: Record<string, unknown>, key: string) {
  const rawValue = record[key];
  return Array.isArray(rawValue) ? rawValue : null;
}

function parseUnknownArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed || trimmed === "[]") return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildCatalogLookup(values: string[], explicitAliases: ReadonlyArray<readonly [string, string]> = []) {
  const lookup = new Map<string, string>();

  values.forEach((value) => {
    if (!value.trim()) return;
    lookup.set(normalizeLookupToken(value), value);
  });

  explicitAliases.forEach(([alias, label]) => {
    if (!alias.trim() || !label.trim()) return;
    lookup.set(normalizeLookupToken(alias), label);
  });

  return lookup;
}

function normalizeLookupToken(value: string) {
  return normalizeText(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeLegacyToken(value: string) {
  return /^[a-z0-9_/-]+$/i.test(value) && (value.includes("_") || value === value.toLowerCase());
}

function humanizeLegacyToken(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}
