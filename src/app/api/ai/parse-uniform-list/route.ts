import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { getCurrentSession } from "@/features/auth/session";
import { findAiModelOption, getAiModelFallbackOptions } from "@/lib/ai/model-options";
import { getAiModel, getSelectedAiModelOption, hasAiModelApiKey } from "@/lib/ai/models";
import { buildUniformListPrompt, UNIFORM_LIST_SYSTEM_PROMPT } from "@/lib/ai/prompts/uniform-list";
import { UniformListSchema, type UniformList } from "@/lib/ai/schemas/uniform-list";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_TEXT_LENGTH = 10_000;
const AI_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_TOKENS = 16_384;
const GROQ_MAX_OUTPUT_TOKENS = 4_096;
const CHUNK_TEXT_LENGTH = 3_500;
const CHUNK_LINE_COUNT = 35;
const GROQ_CHUNK_TEXT_LENGTH = 1_800;
const GROQ_CHUNK_LINE_COUNT = 20;
const JSON_FALLBACK_SYSTEM_PROMPT = `${UNIFORM_LIST_SYSTEM_PROMPT}

Retorne apenas JSON valido, sem markdown, sem comentario e sem texto antes ou depois.
O JSON deve seguir exatamente este formato:
{"items":[{"grupo":null,"nome":null,"numero":null,"tamanho":null,"modelo":"tradicional","confianca":"alta","observacao":null}]}`.trim();

const RequestSchema = z.object({
  aiModel: z.string().optional(),
  text: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .refine((value) => value.trim().length > 0),
});

function errorResponse(message: string, status: number, code?: string) {
  return Response.json({ success: false, error: message, code }, { status });
}

function getAiError(error: unknown) {
  const errorText = getErrorText(error);

  if (/abort|timeout|timed out|terminated|und_err|body_timeout|etimedout/i.test(errorText)) {
    return {
      code: "ai_timeout",
      message: "A lista demorou demais para processar. Tente dividir em blocos menores.",
      status: 504,
    };
  }

  if (/quota|resource_exhausted|rate limit|rate_limit|exceeded your current quota/i.test(errorText)) {
    return {
      code: "ai_rate_limit",
      message: "A IA atingiu o limite de uso agora. Tente outro modelo ou aguarde alguns instantes.",
      status: 429,
    };
  }

  if (NoObjectGeneratedError.isInstance(error)) {
    if (error.finishReason === "length") {
      return {
        code: "ai_output_limit",
        message: "A resposta ficou grande demais para a IA concluir. Tente dividir a lista em partes menores.",
        status: 422,
      };
    }

    return {
      code: "ai_schema",
      message: "A IA retornou dados fora do formato esperado. Tente novamente ou divida a lista.",
      status: 422,
    };
  }

  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) {
      return {
        code: "ai_rate_limit",
        message: "A IA atingiu o limite de uso agora. Tente novamente em instantes.",
        status: 429,
      };
    }

    if (error.statusCode === 413 || /tokens per minute|request too large|rate_limit_exceeded/i.test(errorText)) {
      return {
        code: "ai_token_limit",
        message: "O Groq recusou a lista pelo limite de tokens. Tente dividir em blocos menores ou use outro modelo.",
        status: 413,
      };
    }

    if (error.statusCode && error.statusCode >= 500) {
      return {
        code: "ai_provider",
        message: "O provedor de IA não respondeu corretamente. Tente novamente.",
        status: 502,
      };
    }

    if (error.statusCode) {
      return {
        code: "ai_provider",
        message: "O provedor de IA recusou a solicitação. Tente outro modelo.",
        status: 502,
      };
    }
  }

  if (error instanceof Error && /schema|structured|object|json/i.test(error.message)) {
    return {
      code: "ai_schema",
      message: "A IA retornou dados fora do formato esperado. Tente novamente ou divida a lista.",
      status: 422,
    };
  }

  return {
    code: "ai_unknown",
    message: "Não foi possível organizar a lista agora.",
    status: 502,
  };
}

function getErrorText(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = "cause" in error ? error.cause : undefined;
  const causeText = cause instanceof Error ? `${cause.name} ${cause.message}` : String(cause ?? "");
  const causeCode = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
  const nestedErrors =
    "errors" in error && Array.isArray(error.errors)
      ? error.errors.map((item) => (item instanceof Error ? `${item.name} ${item.message}` : String(item))).join(" ")
      : "";
  const lastError =
    "lastError" in error && error.lastError instanceof Error ? `${error.lastError.name} ${error.lastError.message}` : "";

  return `${error.name} ${error.message} ${causeText} ${causeCode} ${nestedErrors} ${lastError}`;
}

function getProviderLimits(modelValue?: string) {
  const selectedModel = getSelectedAiModelOption(modelValue);

  if (selectedModel.provider === "groq") {
    return {
      chunkLineCount: GROQ_CHUNK_LINE_COUNT,
      chunkTextLength: GROQ_CHUNK_TEXT_LENGTH,
      maxOutputTokens: GROQ_MAX_OUTPUT_TOKENS,
    };
  }

  return {
    chunkLineCount: CHUNK_LINE_COUNT,
    chunkTextLength: CHUNK_TEXT_LENGTH,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  };
}

function splitUniformText(text: string, modelValue?: string) {
  const { chunkLineCount, chunkTextLength } = getProviderLimits(modelValue);
  const lines = text.split(/\r?\n/);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLength = 0;
  let lastSectionHeader = "";

  for (const line of lines) {
    const nextLength = currentLength + line.length + 1;
    const shouldFlush = current.length > 0 && (current.length >= chunkLineCount || nextLength > chunkTextLength);

    if (shouldFlush) {
      chunks.push(current.join("\n"));
      current = lastSectionHeader ? [lastSectionHeader] : [];
      currentLength = lastSectionHeader ? lastSectionHeader.length + 1 : 0;
    }

    current.push(line);
    currentLength += line.length + 1;

    if (/^\s*[^:\r\n]{1,50}:\s*$/.test(line)) {
      lastSectionHeader = line;
    }
  }

  if (current.length > 0) {
    chunks.push(current.join("\n"));
  }

  return chunks;
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Resposta JSON ausente.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function parseUniformOutput(output: unknown) {
  const parsed = UniformListSchema.safeParse(output);

  if (!parsed.success) {
    throw new Error("Resposta JSON fora do schema esperado.");
  }

  return parsed.data;
}

async function parseUniformTextWithJsonMode(text: string, modelValue?: string) {
  const { maxOutputTokens } = getProviderLimits(modelValue);
  const { output } = await generateText({
    model: getAiModel(modelValue),
    output: Output.json({
      description: "Lista organizada de uniformes no formato { items: [...] }.",
      name: "UniformList",
    }),
    system: JSON_FALLBACK_SYSTEM_PROMPT,
    prompt: buildUniformListPrompt(text),
    maxOutputTokens,
    temperature: 0.1,
    timeout: AI_TIMEOUT_MS,
  });

  return parseUniformOutput(output);
}

async function parseUniformTextWithPlainJsonFallback(text: string, modelValue?: string) {
  const { maxOutputTokens } = getProviderLimits(modelValue);
  const { text: rawText } = await generateText({
    model: getAiModel(modelValue),
    system: JSON_FALLBACK_SYSTEM_PROMPT,
    prompt: buildUniformListPrompt(text),
    maxOutputTokens,
    temperature: 0.1,
    timeout: AI_TIMEOUT_MS,
  });

  return parseUniformOutput(parseJsonObject(rawText));
}

async function parseUniformText(text: string, modelValue?: string) {
  const selectedModel = getSelectedAiModelOption(modelValue);
  const { maxOutputTokens } = getProviderLimits(selectedModel.value);

  if (selectedModel.provider === "groq") {
    return parseUniformTextWithJsonMode(text, selectedModel.value).catch(() => parseUniformTextWithPlainJsonFallback(text, selectedModel.value));
  }

  const { output } = await generateText({
    model: getAiModel(selectedModel.value),
    output: Output.object({ schema: UniformListSchema }),
    system: UNIFORM_LIST_SYSTEM_PROMPT,
    prompt: buildUniformListPrompt(text),
    maxOutputTokens,
    temperature: 0.1,
    timeout: AI_TIMEOUT_MS,
  });

  return output;
}

async function parseUniformList(text: string, modelValue?: string): Promise<UniformList> {
  const chunks = splitUniformText(text, modelValue);

  if (chunks.length === 1) {
    return parseUniformText(chunks[0], modelValue);
  }

  const results = await Promise.all(chunks.map((chunk) => parseUniformText(chunk, modelValue)));

  return {
    items: results.flatMap((result) => result.items),
  };
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return errorResponse("Não autenticado.", 401);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse("Envie um JSON válido.", 400);
  }

  const parsed = RequestSchema.safeParse(payload);

  if (!parsed.success) {
    return errorResponse("Texto obrigatório, com limite de 10000 caracteres.", 400);
  }

  const selectedModel = parsed.data.aiModel ? findAiModelOption(parsed.data.aiModel) : null;
  const modelValue = selectedModel?.value;

  if (parsed.data.aiModel && !selectedModel) {
    return errorResponse("Modelo de IA indisponível.", 400);
  }

  const fallbackModels = getAiModelFallbackOptions(modelValue).filter((option) => hasAiModelApiKey(option.value));

  if (fallbackModels.length === 0) {
    return errorResponse("IA não configurada.", 503);
  }

  let lastError: unknown;

  for (const fallbackModel of fallbackModels) {
    try {
      const data = await parseUniformList(parsed.data.text, fallbackModel.value);
      return Response.json({ success: true, data, aiModel: fallbackModel.value });
    } catch (error) {
      lastError = error;
    }
  }

  const aiError = getAiError(lastError);
  return errorResponse(aiError.message, aiError.status, aiError.code);
}
