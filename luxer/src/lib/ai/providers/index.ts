import "server-only";
import { gemini } from "./gemini";
import { openai } from "./openai";
import type { TryOnProvider } from "./types";

export const PROVIDERS: Record<TryOnProvider["id"], TryOnProvider> = { gemini, openai };
/** Modelos padrão sugeridos por provedor (editáveis no painel). */
export const DEFAULT_MODELS: Record<TryOnProvider["id"], { edit: string; analysis: string }> = {
  gemini: { edit: "gemini-2.5-flash-image", analysis: "gemini-2.5-flash" },
  openai: { edit: "gpt-image-1", analysis: "gpt-4.1-mini" },
};
export const providerFor = (id: string): TryOnProvider => PROVIDERS[id as TryOnProvider["id"]] ?? gemini;
export * from "./types";
