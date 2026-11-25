// Servidores SIMULADOS usados somente nos testes automatizados.
// Reproduzem o formato das APIs reais (Pagar.me Core v5 e Gemini generateContent) para exercitar
// o código de integração da loja de ponta a ponta sem credenciais. NÃO substituem o teste em sandbox real.
import http from "node:http";
import sharp from "sharp";

export const pagarme = { orders: new Map(), requests: [] };
const json = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const read = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(b)); });
// IDs únicos entre execuções (o banco de teste guarda pagamentos de execuções anteriores, e providerOrderId é único)
const RUN = Date.now().toString(36);
let seq = 0;

export function startPagarme(port = 4010) {
  return new Promise((resolve) => {
    const srv = http.createServer(async (req, res) => {
      const url = new URL(req.url, "http://x");
      const body = await read(req);
      pagarme.requests.push({ method: req.method, path: url.pathname, auth: req.headers.authorization, body });
      if (!req.headers.authorization?.startsWith("Basic ") && !url.pathname.startsWith("/__")) return json(res, 401, { message: "Authorization has been denied" });
      if (req.method === "POST" && url.pathname === "/core/v5/orders") {
        const o = JSON.parse(body);
        const itemsTotal = o.items.reduce((a, i) => a + i.amount * i.quantity, 0) + (o.shipping?.amount ?? 0);
        if (!o.customer?.document || o.customer.document.length !== 11) return json(res, 422, { message: "customer.document inválido" });
        const id = `or_mock${RUN}${++seq}`, chId = `ch_mock${RUN}${seq}`;
        const pm = o.payments[0].payment_method;
        const charge = { id: chId, status: pm === "pix" ? "pending" : "paid", amount: itemsTotal, payment_method: pm, paid_at: pm === "pix" ? undefined : new Date().toISOString(),
          last_transaction: pm === "pix" ? { id: `tran_${seq}`, status: "waiting_payment", qr_code: `00020101021226860014br.gov.bcb.pix2564pix.mock/${id}5204000053039865406${(itemsTotal / 100).toFixed(2)}5802BR6304ABCD`, qr_code_url: "https://example.invalid/qr.png", expires_at: new Date(Date.now() + 3600e3).toISOString() } : { id: `tran_${seq}`, status: "captured", card: { brand: "Visa", last_four_digits: "1111" } } };
        const order = { id, code: o.code, status: pm === "pix" ? "pending" : "paid", amount: itemsTotal, charges: [charge], metadata: o.metadata, _request: o };
        pagarme.orders.set(id, order);
        return json(res, 200, order);
      }
      let m;
      if (req.method === "GET" && (m = url.pathname.match(/^\/core\/v5\/orders\/(.+)$/))) { const o = pagarme.orders.get(m[1]); return o ? json(res, 200, o) : json(res, 404, { message: "not found" }); }
      if (req.method === "DELETE" && (m = url.pathname.match(/^\/core\/v5\/charges\/(.+)$/))) {
        for (const o of pagarme.orders.values()) for (const c of o.charges) if (c.id === m[1]) {
          const amount = body ? JSON.parse(body).amount ?? c.amount : c.amount;
          c.status = c.status === "paid" ? "refunded" : "canceled"; c.canceled_amount = amount; o.status = "canceled";
          return json(res, 200, c);
        }
        return json(res, 404, { message: "not found" });
      }
      if (req.method === "GET" && url.pathname === "/core/v5/payables") {
        const ch = url.searchParams.get("charge_id");
        for (const o of pagarme.orders.values()) for (const c of o.charges) if (c.id === ch && c.status === "paid") return json(res, 200, { data: [{ id: 1, status: "waiting_funds", amount: c.amount, fee: Math.round(c.amount * 0.0119), type: "credit", payment_date: new Date(Date.now() + 86400e3).toISOString() }] });
        return json(res, 200, { data: [] });
      }
      if (req.method === "POST" && (m = url.pathname.match(/^\/__pay\/(.+)$/))) {
        const o = pagarme.orders.get(m[1]);
        if (!o) return json(res, 404, { message: "not found" });
        o.status = "paid"; o.charges[0].status = "paid"; o.charges[0].paid_at = new Date().toISOString(); o.charges[0].paid_amount = o.charges[0].amount;
        return json(res, 200, o);
      }
      json(res, 404, { message: "rota simulada inexistente" });
    });
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}

// Gemini: responde por tarefa, no formato real do generateContent (JSON estruturado ou imagem inline).
// "detect" controla a detecção ("ok" | "none"); "scores" é a fila de notas de fidelidade da verificação.
export const gemini = { calls: [], detect: "ok", scores: [], fail: null };
export function startGemini(port = 4011) {
  return new Promise((resolve) => {
    const srv = http.createServer(async (req, res) => {
      if (!req.headers["x-goog-api-key"]) return json(res, 403, { error: { message: "API key missing" } });
      if (req.method === "GET") return json(res, 200, { name: req.url, displayName: "Modelo simulado" });
      const j = JSON.parse((await read(req)) || "{}");
      const parts = j.contents?.[0]?.parts ?? [];
      const prompt = parts.find((p) => p.text)?.text ?? "";
      const images = parts.filter((p) => p.inline_data).map((p) => Buffer.from(p.inline_data.data, "base64"));
      const task = prompt.match(/^TASK: (\w+)/)?.[1] ?? "UNKNOWN";
      // falhas simuladas: erro do provedor ou lentidão além do tempo-limite configurado
      if (gemini.fail === "500" && task === "TRY_ON_EDIT") return json(res, 500, { error: { message: "Internal error (simulado)" } });
      if (gemini.fail === "slow" && task === "TRY_ON_EDIT") await new Promise((r) => setTimeout(r, 8000));
      gemini.calls.push({ path: req.url, key: req.headers["x-goog-api-key"], task, images: images.length, prompt, schema: Boolean(j.generationConfig?.responseSchema) });
      const text = (obj) => json(res, 200, { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] }, finishReason: "STOP" }] });
      if (task === "DETECT_REGION") {
        if (gemini.detect === "none") return text({ found: false, region_box: [0, 0, 1, 1], target_box: [0, 0, 1, 1], people_count: 1, target_visibility: "hidden", lighting: "good", sharp: true, wearing_jewelry_on_target: false, guidance_pt: "Não encontramos a mão. Fotografe a mão aberta, com boa luz." });
        return text({ found: true, region_box: [300, 300, 700, 700], target_box: [460, 460, 540, 540], people_count: 1, target_visibility: "clear", lighting: "good", sharp: true, wearing_jewelry_on_target: false, guidance_pt: "" });
      }
      if (task === "JEWEL_PROFILE") return text({ type: "ring", metal_colors: ["yellow gold"], stones: [], key_features: ["polished band"], proportions: "slim band" });
      if (task === "VERIFY_FIDELITY") {
        const score = gemini.scores.length ? gemini.scores.shift() : 88;
        return text({ jewelry_present: true, placed_on_target: true, same_design_score: score, metal_color_match: true, stones_match: true, scale_plausible: true, person_unchanged: true, issues_pt: score < 70 ? "desenho diferente" : "", issues_en: score < 70 ? "band shape differs" : "" });
      }
      if (task === "TRY_ON_EDIT") {
        // edita de verdade a imagem recebida: desenha um aro dourado no centro do recorte
        const m = await sharp(images[0]).metadata();
        const ring = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}"><ellipse cx="${m.width / 2}" cy="${m.height / 2}" rx="${m.width * 0.08}" ry="${m.height * 0.05}" fill="none" stroke="#d4af37" stroke-width="${Math.max(4, m.width * 0.02)}"/></svg>`);
        const out = await sharp(images[0]).composite([{ input: ring }]).png().toBuffer();
        return json(res, 200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: out.toString("base64") } }] }, finishReason: "STOP" }] });
      }
      json(res, 400, { error: { message: "tarefa desconhecida no simulador" } });
    });
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}

// Messages API SIMULADA (Anthropic) — exercita o laço de ferramentas do Concierge sem credencial.
export const anthropic = { calls: [] };
export function startAnthropic(port = 4012) {
  return new Promise((resolve) => {
    const srv = http.createServer(async (req, res) => {
      const body = JSON.parse((await read(req)) || "{}");
      anthropic.calls.push({ path: req.url, beta: req.headers["anthropic-beta"], key: req.headers["x-api-key"], body });
      const last = body.messages?.at(-1);
      const msg = (content, stop) => json(res, 200, { id: `msg_${Date.now()}`, type: "message", role: "assistant", model: body.model, content, stop_reason: stop, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } });
      if (Array.isArray(last?.content) && last.content[0]?.type === "tool_result") {
        const r = last.content[0].content;
        let names = [];
        try { names = JSON.parse(r).map((p) => p.nome); } catch {}
        return msg([{ type: "text", text: names.length ? `Separei estas opções: ${names.slice(0, 2).join(" e ")}.` : "Vou chamar um atendente para você." }], "end_turn");
      }
      const text = typeof last?.content === "string" ? last.content : "";
      if (/atendente|humano|troca/i.test(text)) return msg([{ type: "tool_use", id: "tu_h", name: "request_human", input: { reason: "Cliente pediu troca" } }], "tool_use");
      return msg([{ type: "tool_use", id: "tu_s", name: "search_products", input: { query: text.slice(0, 60) } }], "tool_use");
    });
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}

// OpenAI: chat completions (visão com json_schema) e images/edits (multipart, com máscara)
export const openai = { calls: [] };
const answerFor = (task) => ({
  DETECT_REGION: { found: true, region_box: [300, 300, 700, 700], target_box: [460, 460, 540, 540], people_count: 1, target_visibility: "clear", lighting: "good", sharp: true, wearing_jewelry_on_target: false, guidance_pt: "" },
  JEWEL_PROFILE: { type: "ring", metal_colors: ["yellow gold"], stones: [], key_features: ["polished band"], proportions: "slim band" },
  VERIFY_FIDELITY: { jewelry_present: true, placed_on_target: true, same_design_score: 86, metal_color_match: true, stones_match: true, scale_plausible: true, person_unchanged: true, issues_pt: "", issues_en: "" },
}[task]);
function multipartFiles(body, contentType) {
  const boundary = Buffer.from("--" + contentType.split("boundary=")[1]);
  const out = [];
  let i = body.indexOf(boundary);
  while (i !== -1) {
    const next = body.indexOf(boundary, i + boundary.length);
    if (next === -1) break;
    const part = body.subarray(i + boundary.length + 2, next - 2);
    const sep = part.indexOf("\r\n\r\n");
    const head = part.subarray(0, sep).toString();
    out.push({ name: head.match(/name="([^"]+)"/)?.[1], file: /filename=/.test(head), data: part.subarray(sep + 4) });
    i = next;
  }
  return out;
}
export function startOpenAI(port = 4013) {
  return new Promise((resolve) => {
    const srv = http.createServer(async (req, res) => {
      if (!req.headers.authorization?.startsWith("Bearer ")) return json(res, 401, { error: { message: "missing key" } });
      if (req.method === "GET") return json(res, 200, { id: req.url.split("/").pop(), object: "model" });
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      if (req.url.endsWith("/chat/completions")) {
        const j = JSON.parse(body.toString());
        const text = j.messages[0].content.find((c) => c.type === "text").text;
        const task = text.match(/^TASK: (\w+)/)?.[1];
        openai.calls.push({ kind: "chat", task, images: j.messages[0].content.filter((c) => c.type === "image_url").length, schema: Boolean(j.response_format?.json_schema) });
        return json(res, 200, { choices: [{ message: { role: "assistant", content: JSON.stringify(answerFor(task)) } }] });
      }
      if (req.url.endsWith("/images/edits")) {
        const parts = multipartFiles(body, req.headers["content-type"]);
        const imgs = parts.filter((p) => p.name === "image[]"), mask = parts.find((p) => p.name === "mask");
        const prompt = parts.find((p) => p.name === "prompt")?.data.toString() ?? "";
        const fidelity = parts.find((p) => p.name === "input_fidelity")?.data.toString();
        openai.calls.push({ kind: "edit", images: imgs.length, mask: Boolean(mask), fidelity, prompt });
        const m = await sharp(imgs[0].data).metadata();
        const ring = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}"><ellipse cx="${m.width / 2}" cy="${m.height / 2}" rx="${m.width * 0.08}" ry="${m.height * 0.05}" fill="none" stroke="#d4af37" stroke-width="${Math.max(4, m.width * 0.02)}"/></svg>`);
        const out = await sharp(imgs[0].data).composite([{ input: ring }]).png().toBuffer();
        return json(res, 200, { data: [{ b64_json: out.toString("base64") }] });
      }
      json(res, 404, { error: { message: "rota desconhecida no simulador" } });
    });
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}
