import { z } from "zod";
import { catalogKinds } from "./types.ts";

function emptyToUndefined(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().max(500, "Campo muito longo.").optional());

const optionalMeasurement = z.preprocess((value) => {
  const text = typeof value === "string" || typeof value === "number" ? String(value).trim().replace(",", ".") : "";
  return text ? Number(text) : undefined;
}, z.number({ invalid_type_error: "Informe uma medida válida." }).positive("A medida deve ser maior que zero.").max(1000, "A medida deve ter no máximo 1000 cm.").optional());

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
  fabricType: z.preprocess(emptyToUndefined, z.enum(["PLANO", "TUBULAR"]).optional()),
  fabricWidthCm: optionalMeasurement,
  kind: z.enum(catalogKinds),
  measureBackHeightCm: optionalMeasurement,
  measureBackWidthCm: optionalMeasurement,
  measureFrontHeightCm: optionalMeasurement,
  measureFrontWidthCm: optionalMeasurement,
  measureLongSleeveHeightCm: optionalMeasurement,
  measureLongSleeveWidthCm: optionalMeasurement,
  measureShortSleeveHeightCm: optionalMeasurement,
  measureShortSleeveWidthCm: optionalMeasurement,
  name: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1, "Nome é obrigatório.").max(200, "Nome muito longo."),
  ),
  sortOrder: z.preprocess((value) => {
    const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
    return text ? Number(text) : 0;
  }, z.number().int("Ordem inválida.").default(0)),
}).superRefine((values, context) => {
  const fields = [
    "measureFrontHeightCm", "measureFrontWidthCm", "measureBackHeightCm", "measureBackWidthCm",
    "measureShortSleeveHeightCm", "measureShortSleeveWidthCm", "measureLongSleeveHeightCm", "measureLongSleeveWidthCm",
  ] as const;
  const measurements = fields.map((field) => values[field]);
  const filledCount = measurements.filter((value) => value !== undefined).length;
  const fabricFields = ["fabricWidthCm", "fabricType"] as const;
  const fabricFieldCount = fabricFields.filter((field) => values[field] !== undefined).length;

  if (values.kind !== "tamanho" && filledCount > 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Medidas são permitidas apenas em tamanhos.", path: ["kind"] });
  }

  if (values.kind === "tamanho" && filledCount > 0 && filledCount < measurements.length) {
    fields.forEach((field) => {
      if (values[field] === undefined) context.addIssue({ code: z.ZodIssueCode.custom, message: "Preencha altura e largura das quatro partes.", path: [field] });
    });
  }

  if (values.kind !== "tecido" && fabricFieldCount > 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Largura e tipo são permitidos apenas em tecidos.", path: ["kind"] });
  }

  if (values.kind === "tecido" && fabricFieldCount < fabricFields.length) {
    fabricFields.forEach((field) => {
      if (values[field] === undefined) context.addIssue({ code: z.ZodIssueCode.custom, message: "Informe a largura e o tipo do tecido.", path: [field] });
    });
  }
});

export type CatalogItemValues = z.infer<typeof catalogItemSchema>;
