import type { LanguageModel } from "ai";
import { findAiModelOption, getDefaultAiModelOption } from "@/lib/ai/model-options";
import { geminiProvider, getAiProvider, groqProvider, hasAiProviderApiKey, openRouterProvider } from "@/lib/ai/providers";

export const aiProvider = getAiProvider();

export function getSelectedAiModelOption(value?: unknown) {
  return findAiModelOption(value) ?? getDefaultAiModelOption(aiProvider);
}

export function hasAiModelApiKey(value?: unknown) {
  return hasAiProviderApiKey(getSelectedAiModelOption(value).provider);
}

export function getAiModel(value?: unknown): LanguageModel {
  const option = getSelectedAiModelOption(value);

  if (option.provider === "openrouter") {
    return openRouterProvider(option.model);
  }

  if (option.provider === "gemini") {
    return geminiProvider(option.model);
  }

  return groqProvider(option.model);
}

export const aiModel = getAiModel();
