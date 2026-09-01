import { z } from "zod";
import { appUserRoles } from "@/features/auth/types";

export const usuarioSchema = z
  .object({
    active: z.coerce.boolean().default(false),
    displayName: z.string().trim().min(2, "Informe o nome exibido.").max(120, "Nome muito longo."),
    id: z.string().trim().uuid("Usuário inválido.").optional(),
    pin: z.string().trim().regex(/^\d+$/, "Use apenas números no PIN.").max(12, "PIN muito longo.").optional(),
    role: z.enum(appUserRoles, { required_error: "Selecione a função." }),
    username: z
      .string()
      .trim()
      .min(2, "Informe o usuário.")
      .max(120, "Usuário muito longo.")
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

export type UsuarioValues = z.infer<typeof usuarioSchema>;
