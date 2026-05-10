import { z } from "zod";

export const TechnicalDescriptionSchema = z.object({
  description: z.string(),
  missingFields: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type TechnicalDescription = z.infer<typeof TechnicalDescriptionSchema>;
