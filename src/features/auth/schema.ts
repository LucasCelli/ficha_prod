import { z } from "zod";

export const loginSchema = z.object({
  next: z.string().optional(),
  pin: z.string().trim().min(4, "Informe o PIN com pelo menos 4 digitos."),
  username: z.string().trim().min(2, "Informe o usuario."),
});

export type LoginValues = z.infer<typeof loginSchema>;
