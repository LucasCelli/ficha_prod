import { generateText, Output } from "ai";
import { z } from "zod";
import { getCurrentSession } from "@/features/auth/session";
import { aiModel, hasAiModelApiKey } from "@/lib/ai/models";
import {
  buildTechnicalDescriptionPrompt,
  TECHNICAL_DESCRIPTION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/technical-description";
import { TechnicalDescriptionSchema } from "@/lib/ai/schemas/technical-description";

export const runtime = "nodejs";

const MAX_FIELD_LENGTH = 1_000;
const MAX_NOTES_LENGTH = 3_000;
const MAX_SIZES = 100;
const AI_TIMEOUT_MS = 30_000;

const optionalTextField = z.string().trim().max(MAX_FIELD_LENGTH).optional();

const RequestSchema = z
  .object({
    productType: z.string().trim().min(1).max(MAX_FIELD_LENGTH),
    fabric: optionalTextField,
    color: optionalTextField,
    printType: optionalTextField,
    details: optionalTextField,
    model: optionalTextField,
    sizes: z.array(z.string().trim().min(1).max(30)).max(MAX_SIZES).optional(),
    notes: z.string().trim().max(MAX_NOTES_LENGTH).optional(),
  })
  .strict();

function errorResponse(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

function getAiErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return "A IA demorou para responder. Tente novamente.";
  }

  if (error instanceof Error && /schema|structured|object|json/i.test(error.message)) {
    return "A IA retornou dados fora do formato esperado.";
  }

  return "Não foi possível gerar a descrição agora.";
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return errorResponse("Não autenticado.", 401);
  }

  if (!hasAiModelApiKey()) {
    return errorResponse("IA não configurada.", 503);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse("Envie um JSON válido.", 400);
  }

  const parsed = RequestSchema.safeParse(payload);

  if (!parsed.success) {
    return errorResponse("Dados obrigatórios ausentes ou fora do limite.", 400);
  }

  try {
    const { output } = await generateText({
      model: aiModel,
      output: Output.object({ schema: TechnicalDescriptionSchema }),
      system: TECHNICAL_DESCRIPTION_SYSTEM_PROMPT,
      prompt: buildTechnicalDescriptionPrompt(parsed.data),
      temperature: 0.2,
      timeout: AI_TIMEOUT_MS,
    });

    return Response.json({ success: true, data: output });
  } catch (error) {
    return errorResponse(getAiErrorMessage(error), 502);
  }
}
