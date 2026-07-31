import { z } from "zod";

function trimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalTrimmedString(value: unknown) {
  const text = trimmedString(value);
  return text || undefined;
}

export const createKanbanColumnSchema = z.object({
  name: z.preprocess(trimmedString, z.string().min(1, "Informe o nome da coluna.").max(80, "Nome muito longo.")),
});

export const renameKanbanColumnSchema = z.object({
  name: z.preprocess(trimmedString, z.string().min(1, "Informe o nome da coluna.").max(80, "Nome muito longo.")),
});

export const reorderKanbanColumnsSchema = z.object({
  columnIds: z.array(z.string().uuid("Coluna inválida.")).min(1, "Envie pelo menos uma coluna.").max(50, "Muitas colunas."),
});

export const moveKanbanCardSchema = z.object({
  destinationColumnId: z.string().uuid("Coluna de destino inválida."),
  destinationIndex: z.number().int().min(0, "Posição inválida."),
});

export const createManualKanbanCardSchema = z.object({
  arte: z.preprocess(optionalTrimmedString, z.string().max(500, "Arte muito longa.").optional()),
  columnId: z.string().uuid("Coluna inválida."),
  dataEntrega: z.preprocess(
    trimmedString,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  ),
  evento: z.boolean().default(false),
  material: z.preprocess(optionalTrimmedString, z.string().max(500, "Material muito longo.").optional()),
  title: z.preprocess(trimmedString, z.string().min(1, "Informe o título do cartão.").max(200, "Título muito longo.")),
});
