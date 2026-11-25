/**
 * Contrato dos provedores do LUXER AI TRY-ON. O pipeline só conhece esta interface:
 * trocar de provedor (ou de modelo) não altera detecção, composição nem verificação.
 */
export type ImagePart = { data: Buffer; mime: string };

export interface TryOnProvider {
  readonly id: "gemini" | "openai";
  readonly label: string;
  /** variável de ambiente com a credencial (somente no servidor) */
  readonly envKey: string;
  configured(): boolean;
  /** visão estruturada: devolve JSON validado pelo schema (formato OpenAPI simplificado, tipos em maiúsculas) */
  analyze<T>(model: string, prompt: string, images: ImagePart[], schema: Record<string, unknown>): Promise<T>;
  /**
   * edição generativa: `image` é a foto a editar; `refs`, as fotografias da peça (referência obrigatória);
   * `mask` (PNG do mesmo tamanho de `image`, transparente onde editar) é usada por provedores com inpainting.
   */
  edit(model: string, prompt: string, image: ImagePart, refs: ImagePart[], mask?: Buffer): Promise<ImagePart>;
  /** diagnóstico sem custo de geração */
  check(models: string[]): Promise<{ model: string; ok: boolean; detail: string }[]>;
}

export class TryOnError extends Error {
  constructor(public code: string, message: string, public userMessage?: string) {
    super(message);
  }
}

/** Tempos-limite por chamada (configuráveis para testes de timeout). */
export const timeouts = () => ({
  analyze: Number(process.env.TRYON_ANALYZE_TIMEOUT_MS) || 60_000,
  edit: Number(process.env.TRYON_EDIT_TIMEOUT_MS) || 120_000,
});

/** Converte o schema no formato do Gemini (OBJECT/STRING…) para JSON Schema padrão (object/string…). */
export function toJsonSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(toJsonSchema);
  if (!s || typeof s !== "object") return s;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s as Record<string, unknown>)) out[k] = k === "type" && typeof v === "string" ? v.toLowerCase() : toJsonSchema(v);
  return out;
}

/** Erro de rede/tempo padronizado. */
export function networkError(e: unknown, who: string): TryOnError {
  const name = (e as Error)?.name;
  return new TryOnError(name === "TimeoutError" || name === "AbortError" ? "provider_timeout" : "provider_network", `Falha de comunicação com ${who}: ${(e as Error)?.message ?? e}`);
}
