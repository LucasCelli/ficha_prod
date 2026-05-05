import { z } from "zod";
import { INSUMO_STATUS_VALUES } from "./config";

function trimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalTrimmedString(value: unknown) {
  const text = trimmedString(value);
  return text || undefined;
}

export const createKanbanColumnSchema = z.object({
  name: z.preprocess(trimmedString, z.string().min(1, "Informe o nome da coluna.")),
});

export const renameKanbanColumnSchema = z.object({
  name: z.preprocess(trimmedString, z.string().min(1, "Informe o nome da coluna.")),
});

export const reorderKanbanColumnsSchema = z.object({
  columnIds: z.array(z.string().uuid("Coluna inválida.")).min(1, "Envie pelo menos uma coluna."),
});

export const moveKanbanCardSchema = z.object({
  destinationColumnId: z.string().uuid("Coluna de destino inválida."),
  destinationIndex: z.number().int().min(0, "Posição inválida."),
});

export const createManualKanbanCardSchema = z.object({
  arte: z.preprocess(optionalTrimmedString, z.string().optional()),
  columnId: z.string().uuid("Coluna inválida."),
  dataEntrega: z.preprocess(
    trimmedString,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  ),
  evento: z.boolean().default(false),
  insumoStatus: z.enum(INSUMO_STATUS_VALUES).default("tudo_ok"),
  material: z.preprocess(optionalTrimmedString, z.string().optional()),
  title: z.preprocess(trimmedString, z.string().min(1, "Informe o título do cartão.")),
});

export const updateKanbanCardInsumoSchema = z.object({
  insumoStatus: z.enum(INSUMO_STATUS_VALUES),
});
