import { z } from "zod";

function emptyToUndefined(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function requiredText(label: string, maxLength = 200) {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1, `${label} é obrigatório.`).max(maxLength, `${label} excede o limite de ${maxLength} caracteres.`),
  );
}

function optionalTextWithMax(maxLength = 500) {
  return z.preprocess(
    emptyToUndefined,
    z.string().max(maxLength, `O campo excede o limite de ${maxLength} caracteres.`).optional(),
  );
}

const optionalText = optionalTextWithMax();
const optionalDate = z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.").optional());
const optionalComNomes = z.preprocess((value) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? Number(text) : undefined;
}, z.number().int().min(0).max(3).optional());

const fichaItemSchema = z.object({
  detalhesProduto: optionalText,
  produto: requiredText("Produto"),
  quantidade: z.preprocess((value) => {
    const text = typeof value === "string" || typeof value === "number" ? String(value).trim().replace(",", ".") : "";
    return text ? Number(text) : undefined;
  }, z.number({ invalid_type_error: "Quantidade inválida." }).int("Quantidade deve ser inteira.").min(0, "Quantidade inválida.")),
  tamanho: optionalText,
});

const itensJsonSchema = z.preprocess((value) => {
  if (typeof value !== "string") return [];

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}, z.array(fichaItemSchema).min(1, "Adicione pelo menos um produto para salvar a ficha.").max(200, "Adicione no máximo 200 produtos."));

const managedCloudinaryPublicId = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().max(500, "Imagem inválida.").regex(/^fichas\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/, "Imagem inválida."),
);

const cloudinarySecureUrl = z
  .string()
  .max(2048, "Imagem inválida.")
  .url("Imagem inválida.")
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  }, "Imagem inválida.");

const fichaImageSchema = z.object({
  altText: optionalText,
  bytes: z.number().int().min(0).optional(),
  height: z.number().int().positive().optional(),
  publicId: managedCloudinaryPublicId,
  secureUrl: cloudinarySecureUrl,
  width: z.number().int().positive().optional(),
});

const imagensJsonSchema = z.preprocess((value) => {
  if (typeof value !== "string") return [];

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}, z
  .array(fichaImageSchema)
  .min(1, "Adicione pelo menos uma imagem para salvar a ficha.")
  .max(4, "Adicione no máximo 4 imagens."));

export function normalizeProductForRule(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isRegataProduct(value: string) {
  const product = normalizeProductForRule(value);
  return product.includes("regata") || product.includes("colete");
}

export function isCamisetaProduct(value: string) {
  return normalizeProductForRule(value).includes("camiseta");
}

export function isMangaCurtaELonga(value: unknown) {
  return typeof value === "string" && normalizeProductForRule(value) === "curta e longa";
}

// Mirrors field visibility in ficha-form: hidden fields are not required.
export function getMissingConditionalFields(values: {
  acabamentoGola?: unknown;
  acabamentoManga?: unknown;
  acabamentoMangaLonga?: unknown;
  gola?: unknown;
  larguraGola?: unknown;
  manga?: unknown;
  produtos: string[];
}) {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const produtos = values.produtos.filter((produto) => produto.trim());
  const gola = normalizeProductForRule(text(values.gola));
  const missing: Array<"acabamentoManga" | "acabamentoMangaLonga" | "larguraGola"> = [];
  const camisetas = produtos.filter(isCamisetaProduct);
  const hasCamiseta = camisetas.length > 0;
  const hasManga = camisetas.some((produto) => !isRegataProduct(produto));

  if (hasManga && !text(values.acabamentoManga)) {
    missing.push("acabamentoManga");
  }
  if (hasManga && isMangaCurtaELonga(values.manga) && !text(values.acabamentoMangaLonga)) {
    missing.push("acabamentoMangaLonga");
  }
  if (hasCamiseta && text(values.acabamentoGola) && !gola.includes("polo") && !gola.includes("social") && !text(values.larguraGola)) {
    missing.push("larguraGola");
  }
  return missing;
}

const conditionalFieldMessages = {
  acabamentoManga: "Acabamento da manga é obrigatório.",
  acabamentoMangaLonga: "Acabamento da manga longa é obrigatório.",
  larguraGola: "Largura da gola é obrigatória.",
};

export const fichaFormSchema = z.object({
  clienteId: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().uuid('Selecione um cliente cadastrado ou use "Novo Cliente" para cadastrar um novo cliente.'),
  ),
  cliente: requiredText("Cliente"),
  clienteAuxiliar: optionalText,
  dataInicio: optionalDate,
  dataEntrega: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1, "Data de entrega é obrigatória.").regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  ),
  vendedor: requiredText("Vendedor"),
  numeroVenda: optionalText,
  arte: optionalText,
  material: optionalText,
  composicao: optionalText,
  etiqueta: optionalText,
  corMaterial: optionalText,
  manga: optionalText,
  acabamentoManga: optionalText,
  corAcabamentoManga: optionalText,
  larguraManga: optionalText,
  acabamentoMangaLonga: optionalText,
  corAcabamentoMangaLonga: optionalText,
  larguraMangaLonga: optionalText,
  gola: optionalText,
  acabamentoGola: optionalText,
  corGola: optionalText,
  corDetalheGola: optionalText,
  larguraGola: optionalText,
  corPeitilhoInterno: optionalText,
  corPeitilhoExterno: optionalText,
  corPeDeGolaInterno: optionalText,
  corPeDeGolaExterno: optionalText,
  corBotao: optionalText,
  aberturaLateral: optionalText,
  corAberturaLateral: optionalText,
  reforcoGola: optionalText,
  corReforco: optionalText,
  bolso: optionalText,
  filete: optionalText,
  fileteLocal: optionalText,
  fileteCor: optionalText,
  faixa: optionalText,
  faixaLocal: optionalText,
  faixaCor: optionalText,
  corSublimacao: optionalText,
  comNomes: optionalComNomes,
  imagens: imagensJsonSchema,
  itens: itensJsonSchema,
  listaNomesRaw: optionalTextWithMax(100_000),
  observacoes: optionalTextWithMax(20_000),
  evento: z.preprocess((value) => value === "on" || value === "sim", z.boolean()),
}).superRefine((values, context) => {
  const missing = getMissingConditionalFields({ ...values, produtos: values.itens.map((item) => item.produto) });
  for (const field of missing) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: conditionalFieldMessages[field], path: [field] });
  }
});

export type FichaFormValues = z.infer<typeof fichaFormSchema>;
