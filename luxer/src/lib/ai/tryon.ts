import "server-only";

/**
 * LUXER AI TRY-ON — cliente do provedor (Google Gemini API).
 * Credencial somente no servidor, por variável de ambiente: GEMINI_API_KEY.
 * Dois usos: visão estruturada (JSON com caixas e pareceres) e edição generativa de imagem.
 * GEMINI_API_URL só é usada pela bateria de testes para apontar a um servidor simulado.
 */
export class TryOnError extends Error {
  constructor(public code: string, message: string, public userMessage?: string) {
    super(message);
  }
}

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);
/** Compatibilidade com as telas que perguntam pelo provedor configurado. */
export const providerConfigured = (_p?: string) => geminiConfigured();

export type ImagePart = { data: Buffer; mime: string };
type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
type GeminiResponse = {
  candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string }; text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  error?: { message?: string; status?: string };
};

const BASE = () => (process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com").replace(/\/$/, "");

async function call(model: string, parts: Part[], generationConfig: Record<string, unknown>, timeoutMs: number): Promise<GeminiResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new TryOnError("not_configured", "GEMINI_API_KEY não configurada.");
  let res: Response;
  try {
    res = await fetch(`${BASE()}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new TryOnError((e as Error).name === "TimeoutError" ? "provider_timeout" : "provider_network", `Falha de comunicação com o Gemini: ${(e as Error).message}`);
  }
  const data = (await res.json().catch(() => null)) as GeminiResponse | null;
  if (!res.ok) throw new TryOnError(res.status === 429 ? "provider_rate_limit" : `provider_${res.status}`, data?.error?.message || `Gemini respondeu ${res.status}`);
  if (data?.promptFeedback?.blockReason) throw new TryOnError("blocked", `Conteúdo recusado pelo provedor (${data.promptFeedback.blockReason}).`);
  return data ?? {};
}

const img = (i: ImagePart): Part => ({ inline_data: { mime_type: i.mime, data: i.data.toString("base64") } });

/** Visão estruturada: devolve o JSON validado pelo schema informado ao modelo. */
export async function analyze<T>(model: string, prompt: string, images: ImagePart[], schema: Record<string, unknown>): Promise<T> {
  const data = await call(model, [{ text: prompt }, ...images.map(img)], { responseMimeType: "application/json", responseSchema: schema, temperature: 0 }, 60_000);
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new TryOnError("analysis_invalid", `Resposta de análise inválida (${data.candidates?.[0]?.finishReason ?? "sem motivo"}): ${text.slice(0, 160)}`);
  }
}

/** Edição generativa: a primeira imagem é a foto a editar; as demais, referências obrigatórias da joia. */
export async function generateImage(model: string, prompt: string, images: ImagePart[]): Promise<ImagePart> {
  const data = await call(model, [{ text: prompt }, ...images.map(img)], { responseModalities: ["IMAGE"], temperature: 0.2 }, 120_000);
  for (const part of data.candidates?.[0]?.content?.parts ?? []) {
    const inl = part.inlineData ?? (part.inline_data ? { mimeType: part.inline_data.mime_type, data: part.inline_data.data } : null);
    if (inl?.data) return { data: Buffer.from(inl.data, "base64"), mime: inl.mimeType || "image/png" };
  }
  throw new TryOnError("no_image", `O provedor não retornou imagem (${data.candidates?.[0]?.finishReason ?? "sem motivo"}).`);
}

/** Diagnóstico da integração para o painel: confere chave e modelos sem gerar custo de imagem. */
export async function checkModels(models: string[]): Promise<{ model: string; ok: boolean; detail: string }[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return models.map((model) => ({ model, ok: false, detail: "GEMINI_API_KEY ausente no ambiente do servidor" }));
  return Promise.all(models.map(async (model) => {
    try {
      const r = await fetch(`${BASE()}/v1beta/models/${encodeURIComponent(model)}`, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(15_000) });
      const d = (await r.json().catch(() => null)) as { displayName?: string; error?: { message?: string } } | null;
      return { model, ok: r.ok, detail: r.ok ? d?.displayName ?? "disponível" : d?.error?.message ?? `HTTP ${r.status}` };
    } catch (e) {
      return { model, ok: false, detail: (e as Error).message };
    }
  }));
}
