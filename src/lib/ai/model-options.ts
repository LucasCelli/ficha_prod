import type { AiProvider } from "@/lib/ai/providers";

export type AiModelOption = {
  label: string;
  model: string;
  provider: AiProvider;
  value: string;
};

export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";
export const OPENROUTER_DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct";
export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

export const AI_MODEL_OPTIONS = [
  {
    label: "Groq - GPT-OSS 120B",
    model: GROQ_DEFAULT_MODEL,
    provider: "groq",
    value: "groq:openai/gpt-oss-120b",
  },
  {
    label: "Groq - GPT-OSS 20B",
    model: "openai/gpt-oss-20b",
    provider: "groq",
    value: "groq:openai/gpt-oss-20b",
  },
  {
    label: "OpenRouter - Llama 3.3 70B",
    model: OPENROUTER_DEFAULT_MODEL,
    provider: "openrouter",
    value: "openrouter:meta-llama/llama-3.3-70b-instruct",
  },
  {
    label: "OpenRouter - GPT-4o mini",
    model: "openai/gpt-4o-mini",
    provider: "openrouter",
    value: "openrouter:openai/gpt-4o-mini",
  },
  {
    label: "OpenRouter - Qwen 2.5 72B",
    model: "qwen/qwen-2.5-72b-instruct",
    provider: "openrouter",
    value: "openrouter:qwen/qwen-2.5-72b-instruct",
  },
  {
    label: "Gemini - 2.5 Flash",
    model: GEMINI_DEFAULT_MODEL,
    provider: "gemini",
    value: "gemini:gemini-2.5-flash",
  },
  {
    label: "Gemini - 2.5 Flash-Lite",
    model: "gemini-2.5-flash-lite",
    provider: "gemini",
    value: "gemini:gemini-2.5-flash-lite",
  },
  {
    label: "Gemini - 2.5 Pro",
    model: "gemini-2.5-pro",
    provider: "gemini",
    value: "gemini:gemini-2.5-pro",
  },
] as const satisfies readonly AiModelOption[];

export type AiModelOptionValue = (typeof AI_MODEL_OPTIONS)[number]["value"];

export function findAiModelOption(value: unknown): AiModelOption | null {
  if (typeof value !== "string") return null;
  return AI_MODEL_OPTIONS.find((option) => option.value === value) ?? null;
}

export function getDefaultAiModelOption(provider: AiProvider) {
  return AI_MODEL_OPTIONS.find((option) => option.provider === provider) ?? AI_MODEL_OPTIONS[0];
}
