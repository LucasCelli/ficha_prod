import { z } from "zod";

export const operadorSchema = z
  .object({
    active: z.coerce.boolean().default(false),
    displayName: z.string().trim().min(2, "Informe o nome exibido."),
    id: z.string().trim().optional(),
    pin: z.string().trim().regex(/^\d+$/, "Use apenas números no PIN.").optional(),
    username: z
      .string()
      .trim()
      .min(2, "Informe o usuário.")
      .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou sublinhado."),
  })
  .superRefine((values, context) => {
    if (!values.id && !values.pin) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe um PIN inicial.",
        path: ["pin"],
      });
    }

    if (values.pin && values.pin.length < 4) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe um PIN com pelo menos 4 dígitos.",
        path: ["pin"],
      });
    }
  });

export type OperadorValues = z.infer<typeof operadorSchema>;
