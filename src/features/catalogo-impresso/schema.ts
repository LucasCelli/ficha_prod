import { z } from "zod";
import { catalogPrintSections } from "./types.ts";

const trimmed = (max: number) => z.string().trim().max(max);
const optional = (max: number) => z.preprocess((value) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}, z.string().max(max).optional());

export const catalogPrintSettingsSchema = z.object({
  address: optional(500),
  businessName: trimmed(160).min(1, "Informe o nome da empresa."),
  coverImageUrl: optional(500),
  email: optional(160),
  footerText: optional(500),
  instagram: optional(160),
  logoUrl: optional(500),
  subtitle: optional(300),
  title: trimmed(200).min(1, "Informe o título do catálogo."),
  whatsapp: optional(80),
});

export const catalogPrintCategorySchema = z.object({
  active: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  id: optional(80),
  name: trimmed(120).min(1, "Informe o nome da categoria."),
  section: z.enum(catalogPrintSections),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});

const catalogImageSchema = z.object({
  altText: z.string().trim().max(300).optional().default(""),
  height: z.number().int().positive().nullable().optional(),
  publicId: z.string().trim().max(500).nullable().optional(),
  sourceFichaImageId: z.string().uuid().nullable().optional(),
  url: z.string().url().refine((value) => new URL(value).hostname === "res.cloudinary.com", "A imagem deve estar no Cloudinary."),
  width: z.number().int().positive().nullable().optional(),
});

export const catalogPrintEntrySchema = z.object({
  active: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  categoryId: z.string().uuid("Selecione uma categoria."),
  description: optional(2000),
  highlights: z.preprocess((value) => typeof value === "string" ? value.split("\n").map((line) => line.trim()).filter(Boolean) : [], z.array(z.string().max(180)).max(8, "Informe no máximo oito destaques.")),
  id: optional(80),
  images: z.array(catalogImageSchema).min(1, "Selecione pelo menos uma imagem.").max(4, "Use no máximo quatro imagens."),
  section: z.enum(catalogPrintSections),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  sourceFichaId: z.preprocess((value) => typeof value === "string" && value.trim() ? value.trim() : null, z.string().uuid().nullable()),
  title: trimmed(180).min(1, "Informe o título do artigo."),
});

export const catalogPrintReviewSchema = z.discriminatedUnion("status", [
  z.object({ fichaId: z.string().uuid(), status: z.literal("revisada"), reason: z.string().optional() }),
  z.object({ fichaId: z.string().uuid(), status: z.literal("ignorada"), reason: trimmed(500).min(1, "Informe o motivo." ) }),
]);

export type CatalogPrintEntryInput = z.infer<typeof catalogPrintEntrySchema>;
