import { z } from "zod";

export const loginSchema = z.object({
  next: z.string().max(500).optional(),
  pin: z.string().trim().min(4, "Informe o PIN com pelo menos 4 digitos.").max(12, "PIN inválido."),
  username: z.string().trim().min(2, "Informe o usuário.").max(120, "Usuário inválido."),
});

export type LoginValues = z.infer<typeof loginSchema>;
