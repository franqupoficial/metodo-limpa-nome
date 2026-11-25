import "server-only";
import { providerFor, PROVIDERS } from "./providers";

/**
 * LUXER AI TRY-ON — fachada dos provedores (detalhes em ./providers).
 * Credenciais somente no servidor: GEMINI_API_KEY e/ou OPENAI_API_KEY.
 */
export { TryOnError, type ImagePart } from "./providers";
export { providerFor, PROVIDERS, DEFAULT_MODELS } from "./providers";

/** O provedor configurado no painel tem credencial no servidor? */
export const providerConfigured = (id?: string) => providerFor(id ?? "gemini").configured();
/** Algum provedor de IA generativa disponível (usado para exibir o provador realista). */
export const anyProviderConfigured = () => Object.values(PROVIDERS).some((p) => p.configured());
/** Compatibilidade com telas antigas. */
export const geminiConfigured = () => PROVIDERS.gemini.configured();
export const checkModels = (models: string[], id = "gemini") => providerFor(id).check(models);
