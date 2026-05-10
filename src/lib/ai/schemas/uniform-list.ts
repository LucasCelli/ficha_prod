import { z } from "zod";

export const adultUniformSizes = ["PP", "P", "M", "G", "GG", "XG", "XXG", "XXXG", "XXXGG", "EXG", "G1", "G2", "G3", "G4"] as const;
export const childUniformSizes = ["2", "4", "6", "8", "10", "12", "14", "16"] as const;

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
