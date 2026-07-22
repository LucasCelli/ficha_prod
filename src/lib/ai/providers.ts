import { createGroq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const AI_PROVIDERS = ["groq", "openrouter", "gemini"] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export const DEFAULT_AI_PROVIDER: AiProvider = "gemini";

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (provider === "groq" || provider === "openrouter" || provider === "gemini") {
    return provider;
  }

  return DEFAULT_AI_PROVIDER;
}

export function getAiProviderApiKeyName(provider = getAiProvider()) {
  const keys: Record<AiProvider, string> = {
    gemini: "GOOGLE_GENERATIVE_AI_API_KEY",
    groq: "GROQ_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
  };

  return keys[provider];
}

export function hasAiProviderApiKey(provider = getAiProvider()) {
  return Boolean(process.env[getAiProviderApiKeyName(provider)]);
}

export const groqProvider = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const openRouterProvider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  appName: "Fichas Tecnicas",
});

export const geminiProvider = google;
