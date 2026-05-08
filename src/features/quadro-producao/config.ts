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
  fila_impressao: "Imprimindo/Fotolito Impresso",
  sublimando: "Impresso/Na Estamparia",
  na_costura: "Sublimado/Estampado",
};

const COLUMN_LABELS_BY_PERSONALIZACAO: Record<string, Partial<Record<BaseKanbanColumnSlug, string>>> = {
  acabamento_pdf: {
    pendente: "Preparando Arte",
    exportando: "Exportado PDF",
    na_costura: "PDF Enviado",
  },
  serigrafia: {
    pendente: "Preparando Arte",
    exportando: "Cores Separadas",
    fila_impressao: "Fotolito Impresso",
    sublimando: "Na Estamparia",
    na_costura: "Estampado",
  },
  sublimacao: {
    pendente: "Preparando Arte",
    exportando: "Exportado",
    fila_impressao: "Imprimindo",
    sublimando: "Impresso",
    na_costura: "Sublimado",
  },
};

const HIDDEN_COLUMNS_BY_PERSONALIZACAO: Record<string, ReadonlySet<BaseKanbanColumnSlug>> = {
  acabamento_pdf: new Set(["fila_impressao", "sublimando"]),
};

function normalizePersonalizacaoKey(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getKanbanPersonalizacaoGroup(value: string | null | undefined) {
  const key = normalizePersonalizacaoKey(value);

  if (key.includes("serigrafia")) {
    return "serigrafia";
  }

  if (key.includes("sublimacao")) {
    return "sublimacao";
  }

  if (key.includes("bordado") || key.includes("patch") || key === "dtf" || key.includes("_dtf") || key.includes("dtf_")) {
    return "acabamento_pdf";
  }

  return "todos";
}

export function getKanbanColumnLabel(
  slug: string | null | undefined,
  personalizacao: string | null | undefined,
  fallbackName?: string | null,
) {
  if (!slug || !isBaseKanbanColumnSlug(slug)) {
    return fallbackName || "Sem etapa";
  }

  const group = getKanbanPersonalizacaoGroup(personalizacao);
  return COLUMN_LABELS_BY_PERSONALIZACAO[group]?.[slug] ?? BASE_COLUMN_LABELS[slug];
}

export function isKanbanColumnHiddenForPersonalizacao(slug: string | null | undefined, personalizacao: string | null | undefined) {
  if (!slug || !isBaseKanbanColumnSlug(slug)) {
    return false;
  }

  const group = getKanbanPersonalizacaoGroup(personalizacao);
  return HIDDEN_COLUMNS_BY_PERSONALIZACAO[group]?.has(slug) ?? false;
}

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
