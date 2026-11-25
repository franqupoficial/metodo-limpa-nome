import "server-only";
import { TryOnError, networkError, timeouts, type ImagePart, type TryOnProvider } from "./types";

/** Google Gemini API (generateContent): visão com saída JSON e edição de imagem com várias referências. */
type Resp = {
  candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string }; text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};
const BASE = () => (process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
const part = (i: ImagePart) => ({ inline_data: { mime_type: i.mime, data: i.data.toString("base64") } });

async function call(model: string, parts: unknown[], generationConfig: Record<string, unknown>, timeoutMs: number): Promise<Resp> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new TryOnError("not_configured", "GEMINI_API_KEY não configurada.");
  let res: Response;
  try {
    res = await fetch(`${BASE()}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig }), signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) { throw networkError(e, "o Gemini"); }
  const data = (await res.json().catch(() => null)) as Resp | null;
  if (!res.ok) throw new TryOnError(res.status === 429 ? "provider_rate_limit" : `provider_${res.status}`, data?.error?.message || `Gemini respondeu ${res.status}`);
  if (data?.promptFeedback?.blockReason) throw new TryOnError("blocked", `Conteúdo recusado pelo provedor (${data.promptFeedback.blockReason}).`);
  return data ?? {};
}

export const gemini: TryOnProvider = {
  id: "gemini", label: "Google Gemini", envKey: "GEMINI_API_KEY",
  configured: () => Boolean(process.env.GEMINI_API_KEY),
  async analyze<T>(model: string, prompt: string, images: ImagePart[], schema: Record<string, unknown>) {
    const d = await call(model, [{ text: prompt }, ...images.map(part)], { responseMimeType: "application/json", responseSchema: schema, temperature: 0 }, timeouts().analyze);
    const text = d.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    try { return JSON.parse(text) as T; } catch { throw new TryOnError("analysis_invalid", `Resposta de análise inválida (${d.candidates?.[0]?.finishReason ?? "sem motivo"}): ${text.slice(0, 160)}`); }
  },
  async edit(model, prompt, image, refs) {
    // o Gemini não usa máscara: a região é delimitada pelo recorte e a composição preserva o restante da foto
    const d = await call(model, [{ text: prompt }, part(image), ...refs.map(part)], { responseModalities: ["IMAGE"], temperature: 0.2 }, timeouts().edit);
    for (const p of d.candidates?.[0]?.content?.parts ?? []) {
      const inl = p.inlineData ?? (p.inline_data ? { mimeType: p.inline_data.mime_type, data: p.inline_data.data } : null);
      if (inl?.data) return { data: Buffer.from(inl.data, "base64"), mime: inl.mimeType || "image/png" };
    }
    throw new TryOnError("no_image", `O provedor não retornou imagem (${d.candidates?.[0]?.finishReason ?? "sem motivo"}).`);
  },
  async check(models) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return models.map((model) => ({ model, ok: false, detail: "GEMINI_API_KEY ausente no ambiente do servidor" }));
    return Promise.all(models.map(async (model) => {
      try {
        const r = await fetch(`${BASE()}/v1beta/models/${encodeURIComponent(model)}`, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(15_000) });
        const d = (await r.json().catch(() => null)) as { displayName?: string; error?: { message?: string } } | null;
        return { model, ok: r.ok, detail: r.ok ? d?.displayName ?? "disponível" : d?.error?.message ?? `HTTP ${r.status}` };
      } catch (e) { return { model, ok: false, detail: (e as Error).message }; }
    }));
  },
};
