// Bateria E2E: sobe a loja (build de produção) com integrações apontadas para servidores simulados,
// executa os 15 cenários de aceite no navegador (Playwright) e confere o banco a cada etapa.
// Uso: npm run build && node tests/e2e/run.mjs   (requer DATABASE_URL de um banco de TESTE)
import { spawn } from "node:child_process";
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { startPagarme, startGemini, startAnthropic, startOpenAI, pagarme, gemini, anthropic, openai } from "./mocks.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const PORT = 3200, BASE = `http://localhost:${PORT}`;
const OUT = process.env.E2E_OUT || path.join(ROOT, "storage/e2e");
mkdirSync(OUT, { recursive: true });
const db = new PrismaClient();
const results = [];
const OWNER = { email: "dono@luxer.test", pass: "Teste#Luxer2026" };
const WH = { user: "pagarme-hook", pass: "hook-secret-e2e" };

async function step(n, name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push({ n, name, ok: true, ms: Date.now() - t });
    console.log(`✔ ${n}. ${name}`);
  } catch (e) {
    results.push({ n, name, ok: false, error: e.message.split("\n")[0] });
    // evidência da falha: captura de todas as páginas abertas
    for (const [i, pg] of (globalThis.__browser?.contexts() ?? []).flatMap((c) => c.pages()).entries()) await pg.screenshot({ path: path.join(OUT, `falha-${n}-${i}.png`) }).catch(() => {});
    console.log(`✘ ${n}. ${name}\n   ${e.message.split("\n").slice(0, 3).join("\n   ")}`);
  }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
/** Revisão da foto: espera a análise anatômica (MediaPipe) e envia; sem mão identificada, usa "Tentar assim mesmo". */
async function reviewSubmit(dlg) {
  await dlg.locator('button:has-text("Experimentar com IA"), button:has-text("Tentar assim mesmo")').first().waitFor({ timeout: 60000 });
  const retry = dlg.locator('button:has-text("Tentar assim mesmo")');
  if (await retry.count()) await retry.click(); else await dlg.locator('button:has-text("Experimentar com IA")').click();
}

async function waitReady() {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(BASE + "/robots.txt")).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("servidor não respondeu");
}
/** Executa a ação (clique) e aguarda a resposta da server action antes de ler a mensagem. */
async function act(page, click) {
  const resp = page.waitForResponse((r) => r.request().method() === "POST" && r.request().headers()["next-action"] !== undefined, { timeout: 90000 });
  await click();
  await resp;
  await page.waitForTimeout(400);
  const el = page.locator('[role="status"]').last();
  await el.waitFor({ timeout: 30000 }).catch(() => {});
  return (await el.count()) ? (await el.innerText()).trim() : "";
}
async function msg(page) {
  const el = page.locator('[role="status"]').last();
  await el.waitFor({ timeout: 60000 });
  return (await el.innerText()).trim();
}

const png = (await sharp({ create: { width: 96, height: 96, channels: 3, background: "#c9a96e" } }).png().toBuffer()).toString("base64");
const photoFile = path.join(OUT, "pessoa.jpg");
await sharp({ create: { width: 900, height: 1200, channels: 3, background: "#d8b9a0" } }).jpeg().toFile(photoFile);
const someOriginal = (() => {
  const dir = path.join(ROOT, "storage/catalog-originals");
  const d = readdirSync(dir).find((x) => existsSync(path.join(dir, x, "1.jpg")));
  return path.join(dir, d, "1.jpg");
})();

const [pg, gm, an, oa] = await Promise.all([startPagarme(4010), startGemini(4011), startAnthropic(4012), startOpenAI(4013)]);
const app = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], {
  detached: true,
  cwd: ROOT,
  env: {
    ...process.env, NODE_ENV: "production", APP_URL: BASE,
    PAGARME_SECRET_KEY: "sk_test_mock", PAGARME_API_URL: "http://127.0.0.1:4010/core/v5", PAGARME_WEBHOOK_USER: WH.user, PAGARME_WEBHOOK_PASSWORD: WH.pass,
    GEMINI_API_KEY: "mock-key", GEMINI_API_URL: "http://127.0.0.1:4011", OPENAI_API_KEY: "mock-openai", OPENAI_API_URL: "http://127.0.0.1:4013/v1", TRYON_EDIT_TIMEOUT_MS: "4000", ANTHROPIC_API_KEY: "mock-anthropic", ANTHROPIC_BASE_URL: "http://127.0.0.1:4012", CRON_SECRET: "cron-e2e", SMTP_HOST: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let appLog = "";
app.stdout.on("data", (d) => (appLog += d));
app.stderr.on("data", (d) => (appLog += d));

const browser = await chromium.launch();
  globalThis.__browser = browser;
let exitCode = 0;
try {
  await waitReady();
  // estado limpo: configuração padrão do provador (execuções anteriores podem ter trocado provedor/limites)
  await db.setting.deleteMany({ where: { key: "ai" } });
  const admin = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const ctxCustomer = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const shop = await ctxCustomer.newPage();
  const errors = [];
  for (const p of [admin, shop]) p.on("pageerror", (e) => errors.push(e.message));
  const stamp = Date.now().toString(36).toUpperCase();
  const REF = `E2E${stamp}`;
  let productId, productSlug, orderId, orderToken, pgOrderId;

  // limpeza de execuções anteriores (inclui contadores de tentativa de login)
  await db.rateLimit.deleteMany({});
  await db.coupon.deleteMany({ where: { code: { startsWith: "E2E" } } });

  await step(1, "Login administrativo (e bloqueio de senha errada)", async () => {
    await admin.goto(BASE + "/admin");
    assert(admin.url().includes("/admin/login"), "rota protegida deveria redirecionar ao login");
    await admin.fill("#email", OWNER.email); await admin.fill("#password", "senha-errada");
        assert((await act(admin, () => admin.click('button:has-text("Entrar")'))).includes("incorretos"), "senha errada deveria falhar");
    await admin.fill("#password", OWNER.pass);
    await Promise.all([admin.waitForURL(BASE + "/admin", { timeout: 60000 }), admin.click('button:has-text("Entrar")')]);
    assert(await admin.locator("text=Olá,").isVisible(), "dashboard não carregou");
    // configura frete por tabela (sem Melhor Envio neste ambiente)
    await admin.goto(BASE + "/admin/configuracoes?aba=entrega");
    await admin.selectOption('select[name="provider"]', "table");
    await admin.fill('textarea[name="table"]', "Brasil — envio segurado;01000000;99999999;45,00;7");
        assert((await act(admin, () => admin.click('button:has-text("Salvar")'))).includes("salvas"), "configuração de entrega não salvou");
  });

  await step(2, "Criação de produto", async () => {
    await admin.goto(BASE + "/admin/produtos/novo");
    await admin.fill('input[name="name"]', `Anel Teste ${REF} em Ouro 18k`);
    await admin.fill('input[name="ref"]', REF);
    await admin.fill('input[name="price"]', "1.234,56");
    await admin.fill('input[name="material"]', "Ouro 18 kilates");
    await admin.selectOption('select[name="status"]', "ACTIVE");
    const cat = await db.category.findFirst({ where: { slug: "aneis" } });
    await admin.check(`input[name="categoryIds"][value="${cat.id}"]`);
    await Promise.all([admin.waitForURL(/\/admin\/produtos\/c/, { timeout: 60000 }), admin.click('button:has-text("Salvar produto")')]);
    productId = admin.url().split("/").pop();
    const p = await db.product.findUnique({ where: { id: productId }, include: { variants: true } });
    assert(p && p.priceCents === 123456 && p.status === "ACTIVE" && p.variants.length === 1, "produto não gravado corretamente");
    productSlug = p.slug;
  });

  await step(3, "Alteração de produto (com auditoria)", async () => {
    await admin.goto(`${BASE}/admin/produtos/${productId}`);
    await admin.fill('textarea[name="description"]', "Peça criada pelo teste automatizado. **Ouro 18k**.");
    await admin.fill('input[name="weightG"]', "2,4");
        assert((await act(admin, () => admin.click('button:has-text("Salvar produto")'))).includes("salvo"), "não salvou");
    const p = await db.product.findUnique({ where: { id: productId } });
    assert(p.description.includes("teste automatizado") && Number(p.weightG) === 2.4, "alteração não persistiu");
    const log = await db.auditLog.findFirst({ where: { entityId: productId, action: "product.update" }, orderBy: { createdAt: "desc" } });
    assert(log?.changes?.description, "auditoria sem diff");
  });

  await step(4, "Upload de fotografias", async () => {
    await admin.goto(`${BASE}/admin/produtos/${productId}`);
    await admin.setInputFiles('input[name="files"]', someOriginal);
        assert((await act(admin, () => admin.click('button:has-text("Enviar fotos")'))).includes("enviada"), "upload falhou");
    const imgs = await db.productImage.findMany({ where: { productId } });
    assert(imgs.length === 1 && imgs[0].key.endsWith(".webp"), "imagem não registrada");
    const r = await fetch(`${BASE}/media/${imgs[0].key}`);
    assert(r.ok && r.headers.get("content-type") === "image/webp", "imagem não é servida");
  });

  await step(5, "Alteração de preço", async () => {
    await admin.goto(`${BASE}/admin/produtos/${productId}`);
    await admin.locator('form:has(button:has-text("Salvar produto")) input[name="price"]').fill("1.500,00");
    await act(admin, () => admin.click('button:has-text("Salvar produto")'));
    const p = await db.product.findUnique({ where: { id: productId } });
    assert(p.priceCents === 150000, `preço esperado 150000, obtido ${p.priceCents}`);
    const page = await (await browser.newContext()).newPage();
    await page.goto(`${BASE}/produto/${productSlug}`);
    assert(await page.locator("text=R$ 1.500,00").first().isVisible(), "preço novo não aparece na loja");
    assert(await page.locator("text=R$ 1.395,00 no Pix").isVisible(), "preço Pix (7%) incorreto");
    await page.context().close();
  });

  await step(6, "Controle de estoque (entrada com histórico)", async () => {
    await admin.goto(`${BASE}/admin/estoque?q=${REF}`);
    const row = admin.locator("tr", { hasText: REF });
    await row.locator('select[name="type"]').selectOption("IN");
    await row.locator('input[name="quantity"]').fill("3");
    await row.locator('input[name="reason"]').fill("NF 123 — teste");
    assert((await act(admin, () => row.locator('button:has-text("OK")').click())).includes("3 un"), "entrada não confirmada");
    const v = await db.productVariant.findFirst({ where: { productId } });
    const mv = await db.stockMovement.findFirst({ where: { variantId: v.id, type: "IN" } });
    assert(v.stock === 3 && mv?.quantity === 3, "estoque/movimento incorretos");
    // saída maior que o saldo deve ser recusada
    await row.locator('select[name="type"]').selectOption("OUT");
    await row.locator('input[name="quantity"]').fill("10");
    await row.locator('input[name="reason"]').fill("teste de saída inválida");
    assert((await act(admin, () => row.locator('button:has-text("OK")').click())).includes("insuficiente"), "saída acima do saldo deveria falhar");
  });

  await step(11, "Gestão de cupons", async () => {
    await admin.goto(`${BASE}/admin/marketing/cupons`);
    await admin.fill('input[name="code"]', "E2E10");
    await admin.selectOption('select[name="type"]', "PERCENT");
    await admin.fill('input[name="value"]', "10");
    await admin.fill('input[name="maxUses"]', "5");
    await act(admin, () => admin.click('button:has-text("Salvar cupom")'));
    const c = await db.coupon.findUnique({ where: { code: "E2E10" } });
    assert(c && c.value === 1000 && c.maxUses === 5, "cupom não criado");
  });

  await step(12, "Gestão de banners (aparece na homepage)", async () => {
    await admin.goto(`${BASE}/admin/marketing/banners`);
    await admin.fill('input[name="title"]', `Banner ${REF}`);
    await admin.fill('input[name="ctaLabel"]', "Ver anéis");
    await admin.fill('input[name="ctaUrl"]', "/categoria/aneis");
    await admin.setInputFiles('input[name="image"]', someOriginal);
    await act(admin, () => admin.click('button:has-text("Salvar banner")'));
    await shop.goto(BASE + "/");
    assert(await shop.locator(`text=Banner ${REF}`).first().isVisible(), "banner não aparece na home");
  });

  await step(10, "Cadastro de cliente", async () => {
    await shop.goto(BASE + "/conta/entrar");
    const form = shop.locator("form", { hasText: "Criar conta" });
    await form.locator('input[name="name"]').fill("Cliente Teste E2E");
    await form.locator('input[name="email"]').fill(`cliente.${stamp.toLowerCase()}@luxer.test`);
    await form.locator('input[name="password"]').fill("senha1234");
    await form.locator('input[name="terms"]').check();
    await Promise.all([shop.waitForURL(BASE + "/conta"), form.locator('button:has-text("Criar conta")').click()]);
    assert(await shop.locator("text=Olá, Cliente").isVisible(), "conta não criada");
  });

  await step(7, "Compra completa (sacola → cupom → checkout Pix)", async () => {
    await shop.goto(`${BASE}/produto/${productSlug}`);
    await shop.click('button:has-text("Adicionar à sacola")');
    await shop.locator("text=Adicionado à sacola").waitFor();
    await shop.goto(BASE + "/carrinho");
    await shop.fill('input[name="code"]', "E2E10");
    await shop.click('button:has-text("Aplicar")');
    await shop.locator("text=Cupom E2E10").waitFor({ timeout: 30000 });
    await shop.click("text=Finalizar compra");
    await shop.waitForURL(BASE + "/checkout");
    await shop.fill('input[autocomplete="tel"]', "41987654321");
    await shop.locator('label:has-text("CPF") input').fill("52998224725");
    await shop.fill('input[autocomplete="postal-code"]', "80010180");
    await shop.fill('input[autocomplete="address-line1"]', "Rua Barão do Rio Branco");
    await shop.locator('label:has-text("Número") input').fill("63");
    await shop.locator('label:has-text("Bairro") input').fill("Centro");
    await shop.fill('input[autocomplete="address-level2"]', "Curitiba");
    await shop.locator('label:has-text("UF") input').fill("PR");
    await shop.locator("text=Brasil — envio segurado").waitFor({ timeout: 30000 });
    await shop.locator('form:has(button:has-text("Gerar Pix")) input[type="checkbox"][required]').check();
    await Promise.all([shop.waitForURL(/\/pedido\//, { timeout: 90000 }), shop.click('button:has-text("Gerar Pix")')]);
    orderToken = shop.url().split("/pedido/")[1].split("?")[0];
    const o = await db.order.findUnique({ where: { publicToken: orderToken }, include: { payments: true, items: true } });
    orderId = o.id; pgOrderId = o.payments[0].providerOrderId;
    // 1.500,00 → Pix 1.395,00 → cupom 10% sobre 1.500 = 150 → 1.245,00 + frete 45 = 1.290,00
    assert(o.status === "AWAITING_PAYMENT" && o.totalCents === 129000, `total esperado 129000, obtido ${o.totalCents}`);
    const sent = pagarme.orders.get(pgOrderId)._request;
    const sum = sent.items.reduce((a, i) => a + i.amount, 0) + sent.shipping.amount;
    assert(sum === o.totalCents, `soma enviada ao gateway (${sum}) difere do total`);
    const v = await db.productVariant.findFirst({ where: { productId } });
    assert(v.reserved === 1 && v.stock === 3, "estoque não foi reservado");
    assert((await db.coupon.findUnique({ where: { code: "E2E10" } })).usedCount === 1, "uso do cupom não contabilizado");
    assert(await shop.locator('img[alt="QR Code Pix"]').isVisible(), "QR Code não exibido");
    assert(await shop.locator("text=Copiar código Pix").isVisible(), "copia e cola ausente");
  });

  await step(8, "Pagamento aprovado (webhook autenticado e idempotente)", async () => {
    await fetch(`http://127.0.0.1:4010/__pay/${pgOrderId}`, { method: "POST" });
    const hook = (auth) => fetch(BASE + "/api/webhooks/pagarme", { method: "POST", headers: { "Content-Type": "application/json", ...(auth ? { Authorization: "Basic " + Buffer.from(auth).toString("base64") } : {}) }, body: JSON.stringify({ id: `hook_${stamp}`, type: "order.paid", data: { id: pgOrderId } }) });
    assert((await hook(null)).status === 401, "webhook sem autenticação deveria ser recusado");
    assert((await hook("x:y")).status === 401, "webhook com senha errada deveria ser recusado");
    assert((await hook(`${WH.user}:${WH.pass}`)).ok, "webhook válido falhou");
    assert((await (await hook(`${WH.user}:${WH.pass}`)).json()).duplicate, "reenvio deveria ser idempotente");
    const o = await db.order.findUnique({ where: { id: orderId }, include: { customer: true } });
    const v = await db.productVariant.findFirst({ where: { productId } });
    assert(o.status === "PAID" && o.paymentStatus === "PAID", "pedido não foi marcado como pago");
    assert(v.stock === 2 && v.reserved === 0, `baixa de estoque incorreta (stock ${v.stock}, reserved ${v.reserved})`);
    assert(o.customer.ordersCount === 1 && o.customer.totalSpentCents === 129000, "métricas do cliente não atualizadas");
    assert(await db.emailLog.findFirst({ where: { orderId, template: "order.paid" } }), "e-mail de pagamento não registrado");
    await shop.reload();
    assert(await shop.locator("text=Obrigado, Cliente").isVisible(), "página do pedido não refletiu o pagamento");
  });

  await step(9, "Atualização de pedido (separação → envio com rastreio → entregue)", async () => {
    const go = async (status, tracking) => {
      await admin.goto(`${BASE}/admin/pedidos/${orderId}`);
      await admin.selectOption('select[name="status"]', status);
      if (tracking) await admin.fill('input[name="trackingCode"]', tracking);
      const m = await act(admin, () => admin.click('button:has-text("Atualizar pedido")'));
      assert(m.includes("atualizado"), `falha ao mudar para ${status}: ${m}`);
    };
    await go("PICKING");
    await go("SHIPPED", "AA123456789BR");
    await go("DELIVERED");
    const o = await db.order.findUnique({ where: { id: orderId } });
    assert(o.status === "DELIVERED" && o.trackingUrl?.includes("correios"), "status/rastreio não gravados");
    assert(await db.emailLog.findFirst({ where: { orderId, template: "order.shipped" } }), "e-mail de envio não registrado");
    await admin.goto(`${BASE}/admin/pedidos/${orderId}`);
    await admin.fill('input[name="message"]', "Cliente pediu embalagem para presente");
    await act(admin, () => admin.click('button:has-text("Registrar")'));
    assert(await db.orderEvent.findFirst({ where: { orderId, type: "note" } }), "nota interna não registrada");
    // financeiro: conciliação busca a taxa no gateway
    await admin.goto(`${BASE}/admin/financeiro?periodo=hoje`);
    await admin.click('button:has-text("Conciliar com a Pagar.me")');
    await admin.waitForTimeout(2500);
    const p = await db.payment.findFirst({ where: { orderId } });
    assert(p.feeCents === Math.round(129000 * 0.0119) && p.reconciledAt, "conciliação não registrou a taxa");
  });

  await step(13, "Permissões de usuários (servidor bloqueia o operador)", async () => {
    await admin.goto(`${BASE}/admin/usuarios?novo=1`);
    const email = `operador.${stamp.toLowerCase()}@luxer.test`;
    await admin.fill('input[name="name"]', "Operador Teste");
    await admin.fill('input[name="email"]', email);
    await admin.selectOption('select[name="role"]', "OPERATOR");
    await act(admin, () => admin.click('button:has-text("Criar e enviar convite")'));
    await db.adminUser.update({ where: { email }, data: { passwordHash: await bcrypt.hash("Operador#2026", 12) } });
    const op = await (await browser.newContext()).newPage();
    await op.goto(BASE + "/admin/login");
    await op.fill("#email", email); await op.fill("#password", "Operador#2026");
    await Promise.all([op.waitForURL(BASE + "/admin"), op.click('button:has-text("Entrar")')]);
    for (const u of ["/admin/financeiro", "/admin/produtos/novo", "/admin/usuarios", "/admin/configuracoes"]) {
      await op.goto(BASE + u);
      assert(op.url().includes("sem-permissao"), `operador acessou ${u}`);
    }
    assert(!(await op.locator('a[href="/admin/financeiro"]').count()), "menu exibe módulo sem permissão");
    const csv = await op.request.get(BASE + "/api/admin/clientes");
    assert(csv.status() === 403, "exportação de clientes deveria ser negada");
    // o formulário do produto é visível para consulta, mas o servidor recusa a gravação
    await op.goto(`${BASE}/admin/produtos/${productId}`);
        assert((await act(op, () => op.click('button:has-text("Salvar produto")'))).toLowerCase().includes("permissão"), "servidor deveria recusar a edição");
    // operador pode atualizar pedidos
    await op.goto(`${BASE}/admin/pedidos/${orderId}`);
    assert(await op.locator("text=Itens").first().isVisible(), "operador deveria ver pedidos");
    await op.context().close();
  });

  await step(14, "Provador virtual LUXER AI: detecção → geração → composição → verificação", async () => {
    await admin.goto(BASE + "/admin/luxer-ai");
    await admin.check('input[name="tryOnEnabled"]');
    await admin.fill('input[name="dailyLimitPerClient"]', "3");
    await act(admin, () => admin.click('button:has-text("Salvar configuração")'));
    await act(admin, () => admin.click('button:has-text("Testar integração")'));
    const diag = (await admin.locator('form:has(button:has-text("Testar integração")) [role="status"]').innerText()).trim();
    assert(diag.includes("Integração OK"), "diagnóstico da integração falhou: " + diag);

    // botão PROVAR COM IA na página do produto → modal com a peça carregada
    await shop.goto(`${BASE}/produto/${productSlug}`);
    await shop.click('button:has-text("Experimentar com IA")');
    const dlg = shop.locator('[role="dialog"][aria-label="Provador Luxer AI"]');
    await dlg.waitFor();
    assert(await dlg.locator(`text=Anel Teste ${REF}`).first().isVisible(), "a peça não foi carregada no provador");
    assert(await dlg.locator("text=Fotografe sua mão").isVisible(), "orientação específica da categoria ausente");
    await dlg.locator('input[type="checkbox"]').first().check();
    await dlg.locator('input[type="file"]').setInputFiles(photoFile);
    await dlg.locator("text=Confira sua foto").waitFor();
    const calls0 = gemini.calls.length;
    await reviewSubmit(dlg);
    await dlg.locator('img[alt="Simulação da joia em você"]').waitFor({ timeout: 90000 });

    const r = await db.tryOnRequest.findFirst({ where: { productId }, orderBy: { createdAt: "desc" }, include: { assets: true } });
    assert(r.status === "SUCCEEDED" && r.stage === "done" && r.fidelityScore === 88 && r.generations === 1, `estado inesperado: ${r.status}/${r.stage}/${r.fidelityScore}/${r.generations}`);
    assert(r.costCents > 0 && r.region?.target?.length === 4, "custo ou região detectada não registrados");
    assert(!r.assets.some((x) => x.kind === "INPUT"), "a foto enviada deveria ser apagada ao fim do processamento");
    const res = r.assets.find((x) => x.kind === "RESULT");
    assert(res && Buffer.from(res.data).subarray(0, 3).toString("hex") !== "ffd8ff", "resultado deveria estar criptografado no banco");
    const tasks = gemini.calls.slice(calls0).map((c) => c.task);
    assert(["DETECT_REGION", "TRY_ON_EDIT", "VERIFY_FIDELITY"].every((t) => tasks.includes(t)), "pipeline incompleto: " + tasks.join(","));
    const edit = gemini.calls.slice(calls0).find((c) => c.task === "TRY_ON_EDIT");
    assert(edit.images >= 2 && edit.prompt.includes("mandatory reference") && edit.prompt.includes("finger"), "geração sem a foto da peça como referência ou sem instrução da categoria");

    // composição: mesma dimensão da foto original, fora da região idêntica, na região alterada
    const src = await dlg.locator('img[alt="Simulação da joia em você"]').getAttribute("src");
    const img = await shop.request.get(BASE + src);
    assert(img.status() === 200 && img.headers()["cache-control"].includes("no-store"), "resultado não servido com segurança");
    const buf = await img.body();
    writeFileSync(path.join(OUT, "provador-resultado.jpg"), buf);
    const meta = await sharp(buf).metadata();
    assert(meta.width === 900 && meta.height === 1200, `dimensões alteradas: ${meta.width}x${meta.height}`);
    const px = async (left, top) => { const { data } = await sharp(buf).extract({ left, top, width: 8, height: 8 }).raw().toBuffer({ resolveWithObject: true }); return [data[0], data[1], data[2]]; };
    const corner = await px(20, 20);
    assert(Math.abs(corner[0] - 0xd8) < 8 && Math.abs(corner[1] - 0xb9) < 8 && Math.abs(corner[2] - 0xa0) < 8, "fora da região a foto foi alterada: " + corner);
    // região detectada pelo simulador: caixa [460,460,540,540] → centro em (450, 600) px; o fundo tem azul 0xa0, o dourado aplicado ~0x37
    // stats() do sharp mede a imagem de entrada; por isso o recorte é materializado antes
    const statsOf = async (r) => sharp(await sharp(buf).extract(r).png().toBuffer()).stats();
    const zone = await statsOf({ left: 350, top: 530, width: 200, height: 140 });
    assert(zone.channels[2].min < 0x78, "a joia não foi aplicada na região detectada");
    const far = await statsOf({ left: 0, top: 0, width: 900, height: 300 });
    assert(far.channels[2].min > 0x90, "pixels alterados longe da região de aplicação");
    const other = await (await browser.newContext()).request.get(BASE + src.replace(/t=[^&]+/, "t=" + "x".repeat(32)));
    assert(other.status() === 404, "resultado acessível sem o token correto");

    // reprovação na fidelidade → nova geração orientada → entrega
    gemini.scores = [40, 85];
    await dlg.locator('button:has-text("Gerar novamente")').click();
    await dlg.locator("text=Criando sua prova").waitFor({ timeout: 30000 });
    await dlg.locator('img[alt="Simulação da joia em você"]').waitFor({ timeout: 90000 });
    await shop.waitForTimeout(500);
    const r2 = await db.tryOnRequest.findFirst({ where: { productId }, orderBy: { createdAt: "desc" } });
    assert(r2.id !== r.id && r2.generations === 2 && r2.fidelityScore === 85 && r2.status === "SUCCEEDED", `nova tentativa não ocorreu: ${r2.generations}/${r2.fidelityScore}`);
    assert(gemini.calls.filter((c) => c.task === "TRY_ON_EDIT").at(-1).prompt.includes("band shape differs"), "nova geração não recebeu as divergências apontadas");

    // tamanho + sacola direto do provador
    const opt = dlg.locator("fieldset button:not([disabled])").first();
    if (await opt.count()) await opt.click();
    await dlg.locator('button:has-text("Adicionar à sacola")').click();
    await dlg.locator("text=Adicionado à sacola").waitFor({ timeout: 30000 });
    const inCart = await db.cartItem.count({ where: { variant: { productId } } });
    assert(inCart >= 1, "peça não entrou na sacola pelo provador");

    // exclusão imediata a pedido do cliente
    await dlg.locator('button:has-text("Excluir minhas imagens agora")').click();
    await dlg.locator("text=Imagens excluídas").first().waitFor();
    assert((await db.tryOnAsset.count({ where: { requestId: r2.id } })) === 0, "imagens não excluídas");

    // foto sem a região do corpo: recusada antes da geração (sem custo de imagem), com orientação
    gemini.detect = "none";
    await dlg.locator('button:has-text("Nova foto")').click();
    await dlg.locator('input[type="file"]').setInputFiles(photoFile);
    await reviewSubmit(dlg);
    await dlg.locator("text=Não encontramos a mão").waitFor({ timeout: 60000 });
    gemini.detect = "ok";
    const r3 = await db.tryOnRequest.findFirst({ where: { productId }, orderBy: { createdAt: "desc" } });
    assert(r3.status === "FAILED" && r3.errorCode === "region_not_found" && r3.generations === 0, "foto inadequada deveria ser recusada antes da geração");
    await shop.keyboard.press("Escape");
    // devolve a sacola ao estado anterior para os cenários seguintes
    await shop.goto(BASE + "/carrinho");
    await shop.click('button:has-text("Remover")');
    await shop.locator("text=Sua sacola está vazia").waitFor({ timeout: 30000 });

    // sem consentimento a API recusa
    const nc = await shop.request.post(BASE + "/api/tryon", { multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer: readFileSync(photoFile) }, product: productSlug }, headers: { origin: BASE } });
    assert(nc.status() === 400, "sem consentimento deveria ser recusado");
  });


  await step(16, "Cancelamento de pedido não pago libera a reserva", async () => {
    await shop.goto(`${BASE}/produto/${productSlug}`);
    await shop.click('button:has-text("Adicionar à sacola")');
    await shop.locator("text=Adicionado à sacola").waitFor();
    await shop.goto(BASE + "/checkout");
    await shop.locator('label:has-text("CPF") input').fill("52998224725");
    await shop.locator("text=Brasil — envio segurado").waitFor({ timeout: 30000 });
    await shop.locator('form:has(button:has-text("Gerar Pix")) input[type="checkbox"][required]').check();
    await Promise.all([shop.waitForURL(/\/pedido\//, { timeout: 90000 }), shop.click('button:has-text("Gerar Pix")')]);
    const o = await db.order.findUnique({ where: { publicToken: shop.url().split("/pedido/")[1].split("?")[0] } });
    let v = await db.productVariant.findFirst({ where: { productId } });
    assert(v.reserved === 1, "segunda compra não reservou");
    await admin.goto(`${BASE}/admin/pedidos/${o.id}`);
    await admin.fill('input[name="reason"]', "Cliente desistiu (teste)");
    admin.once("dialog", (d) => d.accept());
    await act(admin, () => admin.click('button:has-text("Cancelar pedido")'));
    v = await db.productVariant.findFirst({ where: { productId } });
    const oc = await db.order.findUnique({ where: { id: o.id } });
    assert(oc.status === "CANCELED" && v.reserved === 0 && v.stock === 2, "cancelamento não liberou a reserva");
    assert([...pagarme.orders.values()].some((x) => x.charges[0].status === "canceled"), "cobrança pendente não foi cancelada no gateway");
  });

  await step(15, "Responsividade (390 px: sem rolagem horizontal)", async () => {
    const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
    const pages = ["/", "/categoria/aneis", `/produto/${productSlug}`, "/luxer-fe", "/carrinho", "/provador", "/conta/entrar", "/admin/login"];
    for (const u of pages) {
      await m.goto(BASE + u, { waitUntil: "networkidle" });
      const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(over <= 1, `${u} tem rolagem horizontal de ${over}px`);
      await m.screenshot({ path: path.join(OUT, `mobile${u.replace(/\W+/g, "-") || "-home"}.png`) });
    }
    await m.goto(BASE + "/admin/login");
    await m.fill("#email", OWNER.email); await m.fill("#password", OWNER.pass);
    await Promise.all([m.waitForURL(BASE + "/admin"), m.click('button:has-text("Entrar")')]);
    for (const u of ["/admin", "/admin/pedidos", `/admin/pedidos/${orderId}`, "/admin/produtos"]) {
      await m.goto(BASE + u, { waitUntil: "networkidle" });
      const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(over <= 1, `${u} tem rolagem horizontal de ${over}px`);
      await m.screenshot({ path: path.join(OUT, `mobile${u.replace(/\W+/g, "-")}.png`) });
    }
    await m.click('button[aria-label="Abrir menu"]');
    assert(await m.locator('aside:visible >> text=Pedidos').first().isVisible(), "menu móvel do admin não abre");
    await m.context().close();
  });

  await step(17, "Rotina agendada protegida", async () => {
    assert((await fetch(BASE + "/api/jobs/run")).status === 401, "rotina sem segredo deveria ser recusada");
    const r = await fetch(BASE + "/api/jobs/run", { headers: { Authorization: "Bearer cron-e2e" } });
    assert(r.ok, "rotina falhou");
    const j = await r.json();
    assert(typeof j.limpeza === "object", "limpeza não executou: " + JSON.stringify(j));
  });

  await step(18, "Concierge: IA consulta o catálogo, transfere para humano e a equipe responde", async () => {
    const c = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    await c.goto(BASE + "/");
    await c.click('button[aria-label="Concierge Luxer"]');
    await c.click("text=Conversar com o Concierge");
    await c.fill('input[aria-label="Mensagem"]', "anel com pedra");
    await c.click('button:has-text("Enviar")');
    await c.locator("text=Separei estas opções").waitFor({ timeout: 60000 });
    const call = anthropic.calls.find((x) => x.body.tools);
    assert(call.body.model === "claude-opus-5-5" && call.beta?.includes("server-side-fallback-2026-07-01") && call.body.fallbacks === "default", "requisição à API sem modelo/fallback esperados");
    assert(call.body.system?.[0]?.cache_control?.type === "ephemeral" && call.body.system[0].text.includes("Luxer"), "prompt de sistema sem cache ou sem dados da loja");
    assert(call.body.output_config?.effort === "low", "esforço deveria ser low para chat");
    assert(anthropic.calls.some((x) => JSON.stringify(x.body.messages).includes("tool_result")), "resultado da ferramenta não retornou ao modelo");
    await c.fill('input[aria-label="Mensagem"]', "quero fazer uma troca, falar com atendente");
    await c.click('button:has-text("Enviar")');
    await c.locator("text=transferida para a equipe").waitFor({ timeout: 60000 });
    const conv = await db.chatConversation.findFirst({ orderBy: { createdAt: "desc" } });
    assert(conv.status === "WAITING_HUMAN" && conv.handoffReason, "conversa não entrou na fila humana");
    assert(await db.adminNotification.findFirst({ where: { link: { contains: conv.id } } }), "equipe não foi notificada");
    await admin.goto(`${BASE}/admin/atendimento?c=${conv.id}`);
    assert(await admin.locator("text=quero fazer uma troca").isVisible(), "mensagem do cliente não aparece no painel");
    await admin.fill('textarea[name="body"]', "Olá! Sou da equipe Luxer, vou te ajudar com a troca.");
    await act(admin, () => admin.click('button:has-text("Responder")'));
    await c.locator("text=vou te ajudar com a troca").waitFor({ timeout: 30000 });
    assert((await db.chatConversation.findUnique({ where: { id: conv.id } })).status === "HUMAN", "status deveria ser HUMAN");
    await c.context().close();
  });

  await step(19, "Compra guiada: ocasião → metal → faixa de investimento com peças reais", async () => {
    await shop.goto(BASE + "/");
    await shop.click('button:has-text("Descobrir minha joia ideal")');
    await shop.click('#atelier button:has-text("Presente especial")');
    await shop.click('#atelier button:has-text("Ouro Amarelo 18k")');
    await shop.click('#atelier button:has-text("Até R$ 1.500")');
    await shop.locator("#atelier >> text=Seleção curada para você").waitFor({ timeout: 60000 });
    await shop.locator("#atelier article").first().waitFor({ timeout: 60000 });
    const n = await shop.locator("#atelier article").count();
    assert(n >= 3, `curadoria retornou ${n} peças`);
    const prices = await shop.locator("#atelier article .tabular-nums").allInnerTexts();
    assert(prices.every((t) => Number(t.replace(/[^\d,]/g, "").replace(",", ".")) < 1500), "peça fora da faixa de investimento: " + prices.join(" | "));
    assert(await shop.locator("#atelier >> text=Ideal para presentear").first().isVisible(), "justificativa consultiva ausente");
    const wa = await shop.locator('#atelier a:has-text("Tirar dúvidas com especialista")').first().getAttribute("href");
    assert(wa?.includes("wa.me") && decodeURIComponent(wa).includes("Presente especial"), "WhatsApp sem intenção pré-preenchida");
    // seletor de metais: troca de acabamento com peça real ou "sob encomenda" honesto
    await shop.click('button[role="radio"]:has-text("Ouro Branco · Ródio")');
    await shop.locator("text=Do acervo, neste acabamento").first().waitFor();
    await shop.click('button[role="radio"]:has-text("Ouro Rosé 18k")');
    await shop.locator("text=Rosé").first().waitFor();
  });

  await step(20, "Remarketing: campanha de recuperação com cupom único e atribuição", async () => {
    await admin.goto(BASE + "/admin/marketing/remarketing");
    await admin.selectOption('form:has(button:has-text("Iniciar campanha")) select[name="segmentId"]', "aceitam-marketing");
    admin.once("dialog", (d) => d.accept());
    const m = await act(admin, () => admin.click('button:has-text("Iniciar campanha")'));
    assert(m.includes("Campanha iniciada"), "campanha não iniciou: " + m);
    const flow = await db.automationFlow.findFirst({ where: { trigger: "MANUAL" }, orderBy: { createdAt: "desc" } });
    const sends = await db.automationSend.findMany({ where: { flowId: flow.id, channel: "EMAIL" } });
    assert(sends.length > 0 && sends.every((x) => x.couponCode), "envios sem cupom");
    const codes = new Set(sends.map((x) => x.couponCode));
    assert(codes.size === sends.length, "cupons deveriam ser únicos por cliente");
    const cp = await db.coupon.findUnique({ where: { code: sends[0].couponCode } });
    assert(cp.maxUses === 1 && cp.value === 1000, "cupom deveria ser de uso único e 10%");
    const r = await fetch(`${BASE}/r/${sends[0].id}`, { redirect: "manual" });
    assert(r.status === 302 && (r.headers.get("location") ?? "").includes("utm_medium=remarketing"), "clique não rastreado");
    assert((await db.automationSend.findUnique({ where: { id: sends[0].id } })).clickedAt, "clique não registrado");
  });
  await step(21, "Provador AR: privacidade → foto da galeria → joia sobreposta → ajuste → captura → compra", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const m = await ctx.newPage();
    // vitrine: atalho "Provar (AR)" nos cards compatíveis abre o provador já carregado
    await m.goto(`${BASE}/categoria/aneis`);
    const arLink = m.locator(`a[href="/produto/${productSlug}?ar=1"]`);
    assert((await arLink.count()) > 0, "card da vitrine sem o atalho Provar (AR)");
    await m.goto(`${BASE}/produto/${productSlug}?ar=1`);
    await m.locator('[role="dialog"][aria-label="Provador virtual AR"]').waitFor();
    await m.keyboard.press("Escape");
    await m.click('button:has-text("Provar na mão (AR)")');
    const dlg = m.locator('[role="dialog"][aria-label="Provador virtual AR"]');
    await dlg.locator("text=processada no seu aparelho").waitFor();
    await dlg.locator('input[type="file"]').setInputFiles(photoFile);
    const cv = dlg.locator("canvas");
    await cv.waitFor();
    // rastreamento carregando ou, sem acesso aos modelos (rede deste ambiente), ajuste manual — nunca tela de erro
    await m.waitForFunction(() => /Rastreando|Não encontramos|Ajuste manual/.test(document.querySelector('[aria-label="Provador virtual AR"]')?.textContent ?? ""), null, { timeout: 60000 });
    await m.waitForTimeout(1500); // desenho estabilizado
    const painted = async () => m.evaluate(() => { const c = document.querySelector('[aria-label="Provador virtual AR"] canvas'); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
    const before = await painted();
    assert(before > 200, "joia não foi desenhada sobre a foto");
    await dlg.locator('button:has-text("Ajustar")').click();
    await dlg.locator('input[type="range"]').first().fill("1.6");
    await m.waitForTimeout(900);
    const after = await painted();
    assert(after > before * 1.5, `o controle de tamanho não alterou a joia (${before} → ${after})`);
    const [dl] = await Promise.all([m.waitForEvent("download"), dlg.locator('button[aria-label="Capturar foto"]').click()]);
    assert(dl.suggestedFilename().startsWith("luxer-"), "captura não foi gerada");
    const wa = await dlg.locator('a:has-text("Consultar Especialista LUXER no WhatsApp")').getAttribute("href");
    assert(decodeURIComponent(wa).includes(`Anel Teste ${REF}`), "WhatsApp sem o nome da joia");
    await dlg.locator('button:has-text("Comprar agora")').click();
    const opt = dlg.locator("button[aria-pressed]:not([disabled])").first();
    if (await opt.count()) { await opt.click(); await dlg.locator('button:has-text("Comprar agora")').click(); }
    await m.waitForURL(/\/carrinho/, { timeout: 30000 });
    assert(await m.locator(`text=Anel Teste ${REF}`).first().isVisible(), "peça provada não entrou na sacola");
    await ctx.close();
  });
  await step(22, "Provador com IA: articulações (híbrido), falha da API, timeout, imagem grande e troca para OpenAI", async () => {
    await admin.goto(BASE + "/admin/luxer-ai");
    await admin.fill('input[name="dailyLimitPerClient"]', "50");
    await act(admin, () => admin.click('button:has-text("Salvar configuração")'));
    let ip = 10;
    const post = (extra = {}, buffer = readFileSync(photoFile)) => shop.request.post(BASE + "/api/tryon", { headers: { origin: BASE, "x-forwarded-for": `10.9.0.${ip++}` }, multipart: { photo: { name: "p.jpg", mimeType: "image/jpeg", buffer }, product: productSlug, consent: "true", ...extra } });
    const settle = async (id) => { for (let i = 0; i < 120; i++) { const r = await db.tryOnRequest.findUnique({ where: { id } }); if (!["QUEUED", "PROCESSING"].includes(r.status)) return r; await new Promise((x) => setTimeout(x, 500)); } throw new Error("simulação não terminou"); };
    // mão com articulações medidas no aparelho (pontos normalizados como os do MediaPipe)
    const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
    Object.assign(hand, { 0: { x: 0.5, y: 0.85 }, 5: { x: 0.4, y: 0.55 }, 9: { x: 0.47, y: 0.53 }, 13: { x: 0.54, y: 0.54 }, 14: { x: 0.55, y: 0.44 }, 17: { x: 0.6, y: 0.57 } });

    // 1) híbrido: sem chamada de detecção paga; escala real no prompt; máscara anatômica
    let n0 = gemini.calls.length;
    let r = await (await post({ hand: JSON.stringify(hand) })).json();
    let row = await settle(r.id);
    const tasks = gemini.calls.slice(n0).map((c) => c.task);
    assert(row.status === "SUCCEEDED" && row.region?.detector === "mediapipe", `híbrido falhou: ${row.status}/${row.errorCode}/${JSON.stringify(row.region)}`);
    assert(!tasks.includes("DETECT_REGION"), "não deveria pagar detecção com articulações medidas no aparelho");
    assert(gemini.calls.slice(n0).find((c) => c.task === "TRY_ON_EDIT").prompt.includes("px wide"), "prompt sem a escala medida");
    // pontos forjados são ignorados (cai na detecção por visão)
    n0 = gemini.calls.length;
    r = await (await post({ hand: JSON.stringify([{ x: 9, y: 9 }]) })).json();
    row = await settle(r.id);
    assert(gemini.calls.slice(n0).some((c) => c.task === "DETECT_REGION"), "dados de articulação inválidos deveriam ser descartados");

    // 2) falha da API do provedor: registrada, mensagem elegante, nada técnico para o cliente
    gemini.fail = "500";
    r = await (await post()).json();
    row = await settle(r.id);
    const st = await (await shop.request.get(`${BASE}/api/tryon/${r.id}?t=${r.token}`)).json();
    assert(row.status === "FAILED" && row.errorCode === "provider_500", `esperado provider_500, obtido ${row.errorCode}`);
    assert(st.error && !/500|internal|gemini/i.test(st.error), "mensagem ao cliente expõe detalhes técnicos: " + st.error);
    assert((await db.tryOnAsset.count({ where: { requestId: r.id } })) === 0, "foto deveria ser apagada também na falha");

    // 3) timeout do provedor (limite de 4 s no ambiente de teste; simulador responde em 8 s)
    gemini.fail = "slow";
    r = await (await post()).json();
    row = await settle(r.id);
    gemini.fail = null;
    assert(row.status === "FAILED" && row.errorCode === "provider_timeout", `esperado provider_timeout, obtido ${row.errorCode}`);

    // 4) imagem excessivamente grande: recusada antes de qualquer processamento
    const big = await post({}, Buffer.alloc(13 * 1024 * 1024, 1));
    assert(big.status() === 413, `imagem grande deveria ser recusada (413), obtido ${big.status()}`);
    // imagem enorme em pixels, porém leve: reduzida para no máximo 1600 px antes de ir ao provedor
    const huge = await sharp({ create: { width: 6000, height: 8000, channels: 3, background: "#d8b9a0" } }).jpeg({ quality: 40 }).toBuffer();
    r = await (await post({}, huge)).json();
    assert(r.ok && Math.max(r.width, r.height) <= 1600, "imagem não foi reduzida");
    await settle(r.id);

    // 5) troca de provedor pelo painel: OpenAI com edição por máscara (inpainting) e alta fidelidade
    await admin.goto(BASE + "/admin/luxer-ai");
    await admin.selectOption('select[name="provider"]', "openai");
    await admin.fill('form:has(input[name="tryOnEnabled"]) input[name="model"]', "gpt-image-1");
    await admin.fill('input[name="analysisModel"]', "gpt-4.1-mini");
    await act(admin, () => admin.click('button:has-text("Salvar configuração")'));
    await act(admin, () => admin.click('button:has-text("Testar integração")'));
    const diag = (await admin.locator('form:has(button:has-text("Testar integração")) [role="status"]').innerText()).trim();
    assert(diag.includes("Integração OK") && diag.includes("gpt-image-1"), "diagnóstico OpenAI: " + diag);
    const o0 = openai.calls.length;
    r = await (await post({ hand: JSON.stringify(hand) })).json();
    row = await settle(r.id);
    const edit = openai.calls.slice(o0).find((c) => c.kind === "edit");
    assert(row.status === "SUCCEEDED" && row.provider === "openai", `OpenAI falhou: ${row.status}/${row.errorCode}/${row.errorMessage}`);
    assert(edit?.mask && edit.images >= 2 && edit.fidelity === "high", "edição OpenAI sem máscara, sem referência da peça ou sem alta fidelidade");
    assert(openai.calls.slice(o0).some((c) => c.kind === "chat" && c.task === "VERIFY_FIDELITY" && c.schema), "verificação de fidelidade não usou saída estruturada");
    // volta ao provedor padrão
    await admin.selectOption('select[name="provider"]', "gemini");
    await admin.fill('form:has(input[name="tryOnEnabled"]) input[name="model"]', "gemini-2.5-flash-image");
    await admin.fill('input[name="analysisModel"]', "gemini-2.5-flash");
    await act(admin, () => admin.click('button:has-text("Salvar configuração")'));
  });



  if (errors.length) console.log("Erros de JavaScript no navegador:\n  " + [...new Set(errors)].join("\n  "));
} finally {
  await browser.close();
  try { process.kill(-app.pid, "SIGTERM"); } catch { app.kill("SIGTERM"); }
  pg.close(); gm.close(); an.close();
  await db.$disconnect();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} cenários aprovados.`);
  if (failed.length) { exitCode = 1; writeFileSync(path.join(OUT, "servidor.log"), appLog); console.log(`Log completo do servidor: ${path.join(OUT, "servidor.log")}`); }
  process.exit(exitCode);
}
