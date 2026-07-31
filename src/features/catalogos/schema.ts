import { z } from "zod";
import { catalogKinds } from "./types";

function emptyToUndefined(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().max(500, "Campo muito longo.").optional());

export const catalogItemSchema = z.object({
  active: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  aliases: z.preprocess((value) => {
    if (typeof value !== "string") return [];
    return value
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean);
  }, z.array(z.string().max(120, "Alias muito longo.")).max(50, "Informe no máximo 50 aliases.").default([])),
  composition: optionalText,
  description: optionalText,
  kind: z.enum(catalogKinds),
  name: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1, "Nome é obrigatório.").max(200, "Nome muito longo."),
  ),
  sortOrder: z.preprocess((value) => {
    const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
    return text ? Number(text) : 0;
  }, z.number().int("Ordem inválida.").default(0)),
});

export type CatalogItemValues = z.infer<typeof catalogItemSchema>;
