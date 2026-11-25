import "server-only";
import { TryOnError, networkError, timeouts, toJsonSchema, type ImagePart, type TryOnProvider } from "./types";

/**
 * OpenAI: visão com saída JSON (chat completions + json_schema) e edição de imagem com MÁSCARA
 * (inpainting em /v1/images/edits, input_fidelity alta). A primeira imagem é a editada; as demais,
 * as fotografias da peça. A máscara restringe a geração à região anatômica do dedo/pulso.
 */
const BASE = () => (process.env.OPENAI_API_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const key = () => {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new TryOnError("not_configured", "OPENAI_API_KEY não configurada.");
  return k;
};
const dataUrl = (i: ImagePart) => `data:${i.mime};base64,${i.data.toString("base64")}`;
async function parse(res: Response) {
  const d = (await res.json().catch(() => null)) as { error?: { message?: string; code?: string } } & Record<string, unknown> | null;
  if (!res.ok) throw new TryOnError(d?.error?.code === "moderation_blocked" ? "blocked" : res.status === 429 ? "provider_rate_limit" : `provider_${res.status}`, d?.error?.message || `OpenAI respondeu ${res.status}`);
  return d ?? {};
}

export const openai: TryOnProvider = {
  id: "openai", label: "OpenAI", envKey: "OPENAI_API_KEY",
  configured: () => Boolean(process.env.OPENAI_API_KEY),
  async analyze<T>(model: string, prompt: string, images: ImagePart[], schema: Record<string, unknown>) {
    let res: Response;
    try {
      res = await fetch(`${BASE()}/chat/completions`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key()}` },
        body: JSON.stringify({
          model, temperature: 0,
          messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...images.map((i) => ({ type: "image_url", image_url: { url: dataUrl(i), detail: "high" } }))] }],
          response_format: { type: "json_schema", json_schema: { name: "luxer_tryon", schema: toJsonSchema(schema), strict: false } },
        }),
        signal: AbortSignal.timeout(timeouts().analyze),
      });
    } catch (e) { throw networkError(e, "a OpenAI"); }
    const d = (await parse(res)) as { choices?: { message?: { content?: string; refusal?: string } }[] };
    const msg = d.choices?.[0]?.message;
    if (msg?.refusal) throw new TryOnError("blocked", `Análise recusada: ${msg.refusal}`);
    try { return JSON.parse(msg?.content ?? "") as T; } catch { throw new TryOnError("analysis_invalid", `Resposta de análise inválida: ${(msg?.content ?? "").slice(0, 160)}`); }
  },
  async edit(model, prompt, image, refs, mask) {
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", prompt);
    form.append("image[]", new Blob([new Uint8Array(image.data)], { type: image.mime }), "foto.jpg");
    refs.forEach((r, i) => form.append("image[]", new Blob([new Uint8Array(r.data)], { type: r.mime }), `peca-${i + 1}.jpg`));
    if (mask) form.append("mask", new Blob([new Uint8Array(mask)], { type: "image/png" }), "mascara.png");
    form.append("input_fidelity", "high");
    form.append("quality", "high");
    form.append("size", "auto");
    let res: Response;
    try {
      res = await fetch(`${BASE()}/images/edits`, { method: "POST", headers: { Authorization: `Bearer ${key()}` }, body: form, signal: AbortSignal.timeout(timeouts().edit) });
    } catch (e) { throw networkError(e, "a OpenAI"); }
    const d = (await parse(res)) as { data?: { b64_json?: string }[] };
    const b64 = d.data?.[0]?.b64_json;
    if (!b64) throw new TryOnError("no_image", "O provedor não retornou imagem.");
    return { data: Buffer.from(b64, "base64"), mime: "image/png" };
  },
  async check(models) {
    const k = process.env.OPENAI_API_KEY;
    if (!k) return models.map((model) => ({ model, ok: false, detail: "OPENAI_API_KEY ausente no ambiente do servidor" }));
    return Promise.all(models.map(async (model) => {
      try {
        const r = await fetch(`${BASE()}/models/${encodeURIComponent(model)}`, { headers: { Authorization: `Bearer ${k}` }, signal: AbortSignal.timeout(15_000) });
        const d = (await r.json().catch(() => null)) as { id?: string; error?: { message?: string } } | null;
        return { model, ok: r.ok, detail: r.ok ? d?.id ?? "disponível" : d?.error?.message ?? `HTTP ${r.status}` };
      } catch (e) { return { model, ok: false, detail: (e as Error).message }; }
    }));
  },
};
