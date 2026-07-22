import { z } from "zod";

export const adultUniformSizes = [
  "PP",
  "P",
  "M",
  "G",
  "GG",
  "52",
  "XG",
  "G1",
  "54",
  "EG",
  "G2",
  "56",
  "EGG",
  "EXG",
  "G3",
  "XXG",
  "XGG",
  "58",
  "EEGG",
  "G4",
  "60",
  "EXGG",
  "G5",
  "ESP1",
  "62",
  "XLG",
  "G6",
  "ESP2",
  "64",
  "G7",
  "ESP3",
] as const;
export const childUniformSizes = ["RN", "1", "2", "4", "6", "8", "10", "12", "14", "16"] as const;

export const UniformListItemSchema = z.object({
  nome: z.string().nullable(),
  numero: z.string().nullable(),
  tamanho: z.string().nullable(),
  modelo: z.enum(["tradicional", "baby_look", "infantil", "regata", "polo", "desconhecido"]),
  confianca: z.enum(["alta", "media", "baixa"]),
  observacao: z.string().nullable(),
});

export const UniformListSchema = z.object({
  items: z.array(UniformListItemSchema),
});

export type UniformListItem = z.infer<typeof UniformListItemSchema>;
export type UniformList = z.infer<typeof UniformListSchema>;
