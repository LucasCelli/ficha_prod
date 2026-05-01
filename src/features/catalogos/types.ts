import type { Database } from "@/lib/supabase/database.types";

export type CatalogKind = Database["public"]["Enums"]["catalog_item_kind"];
export type CatalogItem = Database["public"]["Tables"]["catalog_items"]["Row"];

export const catalogKinds = [
  "produto",
  "tamanho",
  "tecido",
  "cor",
  "manga",
  "acabamento_manga",
  "gola",
  "acabamento_gola",
  "bolso",
] as const satisfies CatalogKind[];

export const catalogKindLabels: Record<CatalogKind, string> = {
  acabamento_gola: "Acabamentos de gola",
  acabamento_manga: "Acabamentos de manga",
  bolso: "Bolsos",
  cor: "Cores",
  gola: "Tipos de gola",
  manga: "Tipos de manga",
  produto: "Produtos",
  tamanho: "Tamanhos",
  tecido: "Tecidos",
};
