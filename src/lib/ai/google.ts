import { google } from "@ai-sdk/google";
import { GEMINI_DEFAULT_MODEL } from "@/lib/ai/model-options";

export const GEMINI_FLASH_ALTERNATIVES = ["gemini-2.0-flash", "gemini-1.5-flash"] as const;

export const geminiFlash = google(GEMINI_DEFAULT_MODEL);
