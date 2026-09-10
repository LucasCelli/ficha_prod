import { z } from "zod";
import { DEFAULT_UNIFORM_SIZE_DEFINITIONS } from "../../uniform-sizes.ts";

const CHILD_SIZE_NAMES = new Set(["RN", "1", "2", "4", "6", "8", "10", "12", "14"]);
export const childUniformSizes = DEFAULT_UNIFORM_SIZE_DEFINITIONS
  .filter((size) => CHILD_SIZE_NAMES.has(size.name))
  .flatMap((size) => [size.name, ...size.aliases]);
export const adultUniformSizes = DEFAULT_UNIFORM_SIZE_DEFINITIONS
  .filter((size) => !CHILD_SIZE_NAMES.has(size.name))
  .flatMap((size) => [size.name, ...size.aliases]);

export const UniformListItemSchema = z.object({
  grupo: z.string().nullable().default(null),
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
