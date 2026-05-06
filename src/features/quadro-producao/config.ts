import type { Database } from "@/lib/supabase/database.types";

export const BASE_KANBAN_COLUMN_SLUGS = [
  "pendente",
  "exportando",
  "fila_impressao",
  "sublimando",
  "na_costura",
] as const;

export const KANBAN_COLUMN_COLOR_TONES = ["primary", "info", "success", "warning", "danger"] as const;

export const INSUMO_STATUS_VALUES = ["tudo_ok", "sem_tecido", "sem_tinta", "sem_papel", "pendencias"] as const;

export type BaseKanbanColumnSlug = (typeof BASE_KANBAN_COLUMN_SLUGS)[number];
export type InsumoStatus = Database["public"]["Enums"]["insumo_status"];

export const INSUMO_STATUS_LABELS: Record<InsumoStatus, string> = {
  tudo_ok: "Tudo OK",
  sem_tecido: "Sem tecido",
  sem_tinta: "Sem tinta",
  sem_papel: "Sem papel",
  pendencias: "Pendências",
};

export const BASE_COLUMN_LABELS: Record<BaseKanbanColumnSlug, string> = {
  pendente: "Preparando Arte",
  exportando: "Exportado/Arte Separada",
  fila_impressao: "Impresso/Fotolito Impresso",
  sublimando: "Sublimando/Na Estamparia",
  na_costura: "Costura/Em Revisão",
};

export function isBaseKanbanColumnSlug(value: string): value is BaseKanbanColumnSlug {
  return BASE_KANBAN_COLUMN_SLUGS.includes(value as BaseKanbanColumnSlug);
}

export function getLegacyKanbanStatusFromSlug(
  slug: string,
): Database["public"]["Enums"]["kanban_status"] {
  if (isBaseKanbanColumnSlug(slug)) {
    return slug;
  }

  return "pendente";
}
