import { z } from "zod";

function emptyToUndefined(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function requiredText(label: string) {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1, `${label} é obrigatório.`),
  );
}

const optionalText = z.preprocess(emptyToUndefined, z.string().optional());
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
}, z.array(fichaItemSchema).min(1, "Adicione pelo menos um produto para salvar a ficha."));

const fichaImageSchema = z.object({
  altText: optionalText,
  bytes: z.number().int().min(0).optional(),
  height: z.number().int().positive().optional(),
  publicId: requiredText("Imagem"),
  secureUrl: z.string().url("Imagem inválida."),
  width: z.number().int().positive().optional(),
});

const imagensJsonSchema = z.preprocess((value) => {
  if (typeof value !== "string") return [];

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}, z.array(fichaImageSchema).max(4, "Adicione no máximo 4 imagens."));

export const fichaFormSchema = z.object({
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
  corMaterial: optionalText,
  manga: optionalText,
  acabamentoManga: optionalText,
  corAcabamentoManga: optionalText,
  larguraManga: optionalText,
  gola: optionalText,
  acabamentoGola: optionalText,
  corGola: optionalText,
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
  observacoes: optionalText,
  evento: z.preprocess((value) => value === "on" || value === "sim", z.boolean()),
});

export type FichaFormValues = z.infer<typeof fichaFormSchema>;
