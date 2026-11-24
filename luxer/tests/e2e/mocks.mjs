// Servidores SIMULADOS usados somente nos testes automatizados.
// Reproduzem o formato das APIs reais (Pagar.me Core v5 e Gemini generateContent) para exercitar
// o código de integração da loja de ponta a ponta sem credenciais. NÃO substituem o teste em sandbox real.
import http from "node:http";

export const pagarme = { orders: new Map(), requests: [] };
const json = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const read = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(b)); });
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
        const id = `or_mock${++seq}`, chId = `ch_mock${seq}`;
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

export const gemini = { calls: [] };
export function startGemini(port = 4011, pngBase64) {
  return new Promise((resolve) => {
    const srv = http.createServer(async (req, res) => {
      const body = await read(req);
      const j = JSON.parse(body || "{}");
      const parts = j.contents?.[0]?.parts ?? [];
      gemini.calls.push({ path: req.url, key: req.headers["x-goog-api-key"], images: parts.filter((p) => p.inline_data).length, prompt: parts.find((p) => p.text)?.text });
      if (!req.headers["x-goog-api-key"]) return json(res, 403, { error: { message: "API key missing" } });
      json(res, 200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: pngBase64 } }] }, finishReason: "STOP" }] });
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
