import { z } from "zod";

function emptyToUndefined(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().max(80, "Campo muito longo.").optional());

export const clienteFormSchema = z.object({
  email: z.preprocess(
    emptyToUndefined,
    z.string().email("Informe um e-mail válido.").max(254, "E-mail muito longo.").optional(),
  ),
  nome: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1, "Nome é obrigatório.").max(200, "Nome muito longo."),
  ),
  telefone: optionalText,
});

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;
