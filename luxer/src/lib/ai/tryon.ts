import "server-only";

/**
 * LUXER AI TRY-ON — provedores de geração/edição de imagem.
 * Credenciais por variáveis de ambiente (nunca no banco nem no painel):
 *   GEMINI_API_KEY  → Google Gemini (modelo padrão: gemini-2.5-flash-image)
 *   OPENAI_API_KEY  → OpenAI Images (modelo padrão: gpt-image-1)
 * A foto do cliente é enviada ao provedor apenas para gerar a simulação e não é gravada pela Luxer.
 */
export type TryOnProvider = "gemini" | "openai";
export type TryOnInput = {
  provider: TryOnProvider;
  model: string;
  person: { data: Buffer; mime: string };
  jewel: { data: Buffer; mime: string };
  category: string;
  productName: string;
  productDetails: string;
};
export type TryOnOutput = { image: Buffer; mime: string };

export class TryOnError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export const providerConfigured = (p: TryOnProvider) => Boolean(p === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY);

const PLACEMENT: Record<string, string> = {
  colares: "around the neck, resting naturally on the collarbone/chest",
  correntes: "around the neck, following the neckline naturally",
  pingentes: "hanging from a chain around the neck, centered on the chest",
  brincos: "on the visible earlobe(s); if both ears are visible, place a matching pair",
  pulseiras: "around the visible wrist",
  aneis: "on a visible finger (ring finger preferred)",
};

export function buildPrompt(i: Pick<TryOnInput, "category" | "productName" | "productDetails">) {
  return [
    "Virtual jewelry try-on. Image 1 is a photo of a real person. Image 2 is the product photo of a real piece of fine jewelry.",
    `Place exactly the jewelry from image 2 ${PLACEMENT[i.category] ?? "where it is naturally worn"} on the person in image 1.`,
    "Hard requirements: reproduce the jewelry faithfully — same design, shape, metal color, stones, number of stones, links, texture and finish. Do not redesign, simplify, embellish or add elements.",
    "Keep realistic physical scale relative to the person's body (fine jewelry is delicate and small). Match the lighting, perspective, shadows and reflections of image 1.",
    "Do not change the person's face, identity, skin tone, body, hair, expression, clothing or the background. Output a single photorealistic image.",
    `Product: ${i.productName}. ${i.productDetails}`.slice(0, 900),
  ].join("\n");
}

async function gemini(i: TryOnInput): Promise<TryOnOutput> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new TryOnError("not_configured", "GEMINI_API_KEY não configurada.");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(i.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: buildPrompt(i) },
          { inline_data: { mime_type: i.person.mime, data: i.person.data.toString("base64") } },
          { inline_data: { mime_type: i.jewel.mime, data: i.jewel.data.toString("base64") } },
        ],
      }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string }; text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
    error?: { message?: string; status?: string };
  } | null;
  if (!res.ok) throw new TryOnError(`provider_${res.status}`, data?.error?.message || `Gemini respondeu ${res.status}`);
  if (data?.promptFeedback?.blockReason) throw new TryOnError("blocked", `Imagem recusada pelo provedor (${data.promptFeedback.blockReason}).`);
  for (const part of data?.candidates?.[0]?.content?.parts ?? []) {
    const inl = part.inlineData ?? (part.inline_data ? { mimeType: part.inline_data.mime_type, data: part.inline_data.data } : null);
    if (inl?.data) return { image: Buffer.from(inl.data, "base64"), mime: inl.mimeType || "image/png" };
  }
  throw new TryOnError("no_image", `O provedor não retornou imagem (${data?.candidates?.[0]?.finishReason ?? "sem motivo"}).`);
}

async function openai(i: TryOnInput): Promise<TryOnOutput> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new TryOnError("not_configured", "OPENAI_API_KEY não configurada.");
  const form = new FormData();
  form.append("model", i.model);
  form.append("prompt", buildPrompt(i));
  form.append("image[]", new Blob([new Uint8Array(i.person.data)], { type: i.person.mime }), "person.jpg");
  form.append("image[]", new Blob([new Uint8Array(i.jewel.data)], { type: i.jewel.mime }), "jewel.jpg");
  form.append("input_fidelity", "high");
  form.append("quality", "high");
  form.append("size", "auto");
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(180_000),
  });
  const data = (await res.json().catch(() => null)) as { data?: { b64_json?: string }[]; error?: { message?: string; code?: string } } | null;
  if (!res.ok) throw new TryOnError(data?.error?.code === "moderation_blocked" ? "blocked" : `provider_${res.status}`, data?.error?.message || `OpenAI respondeu ${res.status}`);
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new TryOnError("no_image", "O provedor não retornou imagem.");
  return { image: Buffer.from(b64, "base64"), mime: "image/png" };
}

export function generateTryOn(i: TryOnInput): Promise<TryOnOutput> {
  return i.provider === "openai" ? openai(i) : gemini(i);
}
