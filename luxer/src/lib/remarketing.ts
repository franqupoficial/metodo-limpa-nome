import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { randomCode } from "./crypto";
import { sendMail, appUrl } from "./mail";
import { unsubUrl } from "./campaigns";
import { getSettings } from "./settings";
import { mediaUrl } from "./media-url";
import { formatMoney, formatDate } from "./format";
import { visibleWhere } from "./catalog";
import { resolveSegment } from "./segment-resolve";
import { REVENUE_STATUSES } from "./order-status";

/**
 * Remarketing automático.
 * Cada fluxo seleciona clientes elegíveis, gera um cupom ÚNICO de uso individual (quando configurado),
 * envia e-mail personalizado com recomendações reais do catálogo e, se não houver compra, um lembrete.
 * WhatsApp: as mensagens entram numa fila para envio pela equipe (wa.me) — apenas com consentimento.
 * Toda venda paga com o cupom (ou após clique no e-mail, em até 7 dias) é atribuída ao fluxo.
 */
export type FlowConfig = {
  inactiveDays?: number;
  delayDays?: number;
  minSpentCents?: number;
  couponPercent?: number;
  couponDays?: number;
  followUpDays?: number;
  channel?: "EMAIL" | "WHATSAPP" | "BOTH";
  subject: string;
  body: string;
  reminderSubject?: string;
  reminderBody?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  whatsappText?: string;
  /** campanha manual: público e execução única */
  segmentId?: string | null;
  runOnce?: boolean;
  batchPerRun?: number;
};

export const TRIGGERS: Record<string, { label: string; description: string }> = {
  WINBACK: { label: "Reativação de inativos", description: "Clientes que compraram, mas não voltam há X dias." },
  NEVER_BOUGHT: { label: "Reconexão da base", description: "Cadastrados sem pedido pago na nova loja — inclui a base importada da plataforma anterior (cujo histórico de compras não veio na exportação)." },
  BIRTHDAY: { label: "Aniversário", description: "No dia do aniversário do cliente (data de nascimento cadastrada)." },
  POST_PURCHASE: { label: "Pós-compra", description: "X dias após a entrega: agradecimento, pedido de avaliação e sugestões." },
  WELCOME: { label: "Boas-vindas", description: "Inscritos e novas contas sem compra, no dia seguinte ao cadastro." },
  VIP: { label: "Clientes VIP", description: "Clientes de alto valor: atendimento e lançamentos exclusivos." },
  MANUAL: { label: "Campanha de recuperação", description: "Disparo único para um público escolhido pelo administrador." },
};

export const DEFAULT_FLOWS: { trigger: string; name: string; config: FlowConfig }[] = [
  {
    trigger: "WINBACK", name: "Reativação — sentimos sua falta",
    config: { inactiveDays: 180, couponPercent: 8, couponDays: 15, followUpDays: 7, channel: "BOTH",
      subject: "{nome}, separamos algo especial para você", body: "Faz um tempo que você não nos visita — e temos novidades em ouro 18k que combinam com você.\n\nComo boas-vindas de volta, preparamos um cupom exclusivo de {desconto} válido até {validade}.",
      reminderSubject: "Seu cupom {cupom} expira em breve", reminderBody: "Passando para lembrar: o seu cupom exclusivo de {desconto} vale até {validade}. Ele é pessoal e de uso único.",
      ctaLabel: "Ver novidades", ctaUrl: "/busca?ordem=novidades", whatsappText: "Olá, {nome}! Aqui é da Luxer Joias. Sentimos sua falta e separamos um cupom exclusivo de {desconto}: {cupom} (válido até {validade}). Posso te ajudar a escolher uma peça?" },
  },
  {
    trigger: "NEVER_BOUGHT", name: "Reconexão — base cadastrada sem pedido na nova loja",
    config: { couponPercent: 5, couponDays: 20, followUpDays: 10, channel: "EMAIL", batchPerRun: 60,
      subject: "{nome}, a Luxer Joias tem uma loja nova", body: "Renovamos nossa loja: navegação mais simples, Pix com desconto, parcelamento no cartão e um provador virtual com inteligência artificial.\n\nPara celebrar a nova casa, um presente para você: {desconto} de desconto com o cupom abaixo, válido até {validade}.",
      reminderSubject: "Seu presente na nova loja Luxer ainda está aqui", reminderBody: "O cupom {cupom} ({desconto}) continua válido até {validade}.",
      ctaLabel: "Conhecer a nova loja", ctaUrl: "/" },
  },
  {
    trigger: "BIRTHDAY", name: "Feliz aniversário",
    config: { couponPercent: 10, couponDays: 30, channel: "BOTH",
      subject: "Feliz aniversário, {nome}! 🎉", body: "Hoje é o seu dia — e queremos celebrar com você.\n\nAceite um presente da Luxer: {desconto} de desconto em qualquer joia até {validade}.",
      ctaLabel: "Escolher meu presente", ctaUrl: "/", whatsappText: "Feliz aniversário, {nome}! 🎉 A Luxer Joias preparou um presente: {desconto} de desconto com o cupom {cupom}, válido até {validade}." },
  },
  {
    trigger: "POST_PURCHASE", name: "Pós-compra — avaliação e sugestões",
    config: { delayDays: 15, couponPercent: 0, channel: "EMAIL",
      subject: "{nome}, como ficou a sua joia?", body: "Esperamos que a sua joia tenha chegado perfeita. Sua opinião ajuda outras pessoas a escolherem: conte como foi na página do produto.\n\nSeparamos também algumas peças que combinam com a sua escolha.",
      ctaLabel: "Avaliar minha compra", ctaUrl: "/conta" },
  },
  {
    trigger: "WELCOME", name: "Boas-vindas",
    config: { delayDays: 1, couponPercent: 5, couponDays: 10, channel: "EMAIL",
      subject: "Bem-vinda(o) à Luxer Joias", body: "Obrigado por se cadastrar. Somos uma joalheria de Curitiba especializada em ouro 18 quilates, com certificado de garantia e nota fiscal.\n\nPara começar, um cupom de {desconto} válido até {validade}.",
      ctaLabel: "Explorar joias", ctaUrl: "/" },
  },
  {
    trigger: "VIP", name: "Clientes VIP",
    config: { minSpentCents: 1_000_000, couponPercent: 0, channel: "WHATSAPP",
      subject: "{nome}, uma seleção exclusiva para você", body: "Como cliente especial da Luxer, você tem atendimento dedicado. Fale com a nossa equipe para conhecer peças em primeira mão.",
      ctaLabel: "Falar com a Luxer", ctaUrl: "/contato", whatsappText: "Olá, {nome}! Aqui é da Luxer Joias. Como cliente especial, queria te mostrar em primeira mão algumas peças novas. Posso te enviar?" },
  },
];

export async function ensureDefaultFlows() {
  for (const f of DEFAULT_FLOWS) {
    if (!(await prisma.automationFlow.findFirst({ where: { trigger: f.trigger } }))) await prisma.automationFlow.create({ data: { trigger: f.trigger, name: f.name, active: false, config: f.config } });
  }
}

type Recipient = { id: string; name: string; email: string; phone: string | null; marketingOptIn: boolean; whatsappOptIn: boolean; smsOptIn: boolean };
const recipientSelect = { id: true, name: true, email: true, phone: true, marketingOptIn: true, whatsappOptIn: true, smsOptIn: true } satisfies Prisma.CustomerSelect;

const DAY = 86_400_000;
const spToday = () => { const d = new Date(Date.now() - 3 * 3600_000); return { m: d.getUTCMonth() + 1, d: d.getUTCDate(), y: d.getUTCFullYear() }; };

/** Público elegível de um fluxo (sem filtrar consentimento — o envio decide por canal). */
export async function flowAudience(trigger: string, c: FlowConfig, limit = 500): Promise<{ list: (Recipient & { dedupeKey: string })[]; total: number }> {
  const base: Prisma.CustomerWhereInput = { anonymizedAt: null };
  let where: Prisma.CustomerWhereInput = base;
  let key = (r: { id: string }) => r.id;
  const now = Date.now();
  switch (trigger) {
    case "WINBACK":
      where = { ...base, ordersCount: { gte: 1 }, lastOrderAt: { lt: new Date(now - (c.inactiveDays ?? 180) * DAY) } };
      key = (r) => `${r.id}:${new Date().getFullYear()}-${Math.floor(new Date().getMonth() / 6)}`; // no máximo 1x por semestre
      break;
    case "NEVER_BOUGHT":
      where = { ...base, ordersCount: 0, createdAt: { lt: new Date(now - 2 * DAY) } };
      break;
    case "VIP":
      where = { ...base, totalSpentCents: { gte: c.minSpentCents ?? 1_000_000 } };
      key = (r) => `${r.id}:${new Date().toISOString().slice(0, 7)}`; // 1x por mês
      break;
    case "WELCOME":
      where = { ...base, ordersCount: 0, source: null, createdAt: { gte: new Date(now - 7 * DAY), lt: new Date(now - (c.delayDays ?? 1) * DAY) } };
      break;
    case "BIRTHDAY": {
      const t = spToday();
      const ids = await prisma.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Customer" WHERE "anonymizedAt" IS NULL AND "birthDate" IS NOT NULL AND EXTRACT(MONTH FROM "birthDate") = ${t.m} AND EXTRACT(DAY FROM "birthDate") = ${t.d}`;
      where = { id: { in: ids.map((i) => i.id) } };
      key = (r) => `${r.id}:${t.y}`;
      break;
    }
    case "POST_PURCHASE": {
      const since = new Date(now - (c.delayDays ?? 15) * DAY);
      const orders = await prisma.order.findMany({ where: { customerId: { not: null }, OR: [{ deliveredAt: { lt: since, gt: new Date(now - 60 * DAY) } }, { deliveredAt: null, status: "SHIPPED", shippedAt: { lt: new Date(since.getTime() - 7 * DAY), gt: new Date(now - 60 * DAY) } }] }, select: { id: true, customerId: true } });
      const byCustomer = new Map(orders.map((o) => [o.customerId!, o.id]));
      where = { id: { in: [...byCustomer.keys()] }, anonymizedAt: null };
      key = (r) => `order:${byCustomer.get(r.id)}`;
      break;
    }
    case "MANUAL": {
      const seg = await resolveSegment(c.segmentId);
      where = { AND: [base, seg?.where ?? {}] };
      break;
    }
  }
  const [total, rows] = await Promise.all([prisma.customer.count({ where }), prisma.customer.findMany({ where, select: recipientSelect, take: limit, orderBy: { createdAt: "asc" } })]);
  return { total, list: rows.map((r) => ({ ...r, dedupeKey: key(r) })) };
}

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

/** Recomendações reais: categorias que o cliente já comprou; senão, destaques da loja. */
async function recommendations(customerId: string, take = 3) {
  const cats = await prisma.$queryRaw<{ id: string }[]>`
    SELECT c."id" FROM "OrderItem" i JOIN "Order" o ON o."id"=i."orderId" JOIN "Category" c ON c."id" = ANY(i."categoryIds")
    WHERE o."customerId" = ${customerId} AND o."status"::text = ANY(${REVENUE_STATUSES as string[]}) AND c."parentId" IS NOT NULL GROUP BY c."id" ORDER BY COUNT(*) DESC LIMIT 2`;
  const bought = (await prisma.orderItem.findMany({ where: { order: { customerId } }, select: { productId: true } })).map((i) => i.productId).filter(Boolean) as string[];
  return prisma.product.findMany({
    where: { AND: [visibleWhere(), { images: { some: {} } }, { id: { notIn: bought } }, cats.length ? { categories: { some: { categoryId: { in: cats.map((c) => c.id) } } } } : {}] },
    orderBy: [{ featured: "desc" }, { salesCount: "desc" }, { priceCents: "desc" }],
    take,
    select: { name: true, slug: true, priceCents: true, images: { take: 1, orderBy: { position: "asc" }, select: { thumbKey: true } } },
  });
}

function productCards(items: Awaited<ReturnType<typeof recommendations>>, utm: string) {
  if (!items.length) return "";
  const abs = (u: string | null) => (u ? (u.startsWith("http") ? u : appUrl() + u) : "");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr>${items.map((p) => `<td width="33%" valign="top" style="padding:4px;text-align:center"><a href="${appUrl()}/produto/${p.slug}?${utm}" style="text-decoration:none;color:#1a1a1a"><img src="${abs(mediaUrl(p.images[0]?.thumbKey ?? null))}" width="160" style="width:100%;max-width:160px;background:#f4f1ec" alt=""><div style="font-family:Georgia,serif;font-size:13px;margin-top:6px">${p.name.replace(/</g, "")}</div><div style="font-size:12px;color:#8a857c">${formatMoney(p.priceCents)}</div></a></td>`).join("")}</tr></table>`;
}

async function createCoupon(flowName: string, percent: number, days: number) {
  for (let i = 0; i < 5; i++) {
    const code = `LUX${randomCode(6)}`;
    try {
      return await prisma.coupon.create({ data: { code, type: "PERCENT", value: Math.round(percent * 100), maxUses: 1, usesPerCustomer: 1, endsAt: new Date(Date.now() + days * DAY), description: `Remarketing: ${flowName}`, active: true } });
    } catch { /* colisão de código: tenta outro */ }
  }
  throw new Error("Não foi possível gerar cupom único.");
}

/** Executa um fluxo: primeira mensagem para novos elegíveis + lembretes. Retorna contagens. */
export async function runFlow(flowId: string, opts: { force?: boolean } = {}) {
  const flow = await prisma.automationFlow.findUniqueOrThrow({ where: { id: flowId } });
  if (!flow.active && !opts.force) return { sent: 0, queued: 0, reminders: 0 };
  const c = flow.config as FlowConfig;
  const s = await getSettings();
  const batch = c.batchPerRun ?? 80;
  const { list } = await flowAudience(flow.trigger, c, 2000);
  const existing = new Set((await prisma.automationSend.findMany({ where: { flowId, step: 1 }, select: { dedupeKey: true, channel: true } })).map((x) => `${x.dedupeKey}|${x.channel}`));
  const channels = c.channel === "BOTH" ? ["EMAIL", "WHATSAPP"] : [c.channel ?? "EMAIL"];
  let sent = 0, queued = 0;

  for (const r of list) {
    if (sent + queued >= batch) break;
    const emailOk = channels.includes("EMAIL") && r.marketingOptIn && !existing.has(`${r.dedupeKey}|EMAIL`);
    const waOk = channels.includes("WHATSAPP") && (r.whatsappOptIn || r.smsOptIn) && Boolean(r.phone) && !existing.has(`${r.dedupeKey}|WHATSAPP`);
    if (!emailOk && !waOk) continue;
    const coupon = c.couponPercent ? await createCoupon(flow.name, c.couponPercent, c.couponDays ?? 15) : null;
    const vars = { nome: r.name.split(" ")[0], cupom: coupon?.code ?? "", desconto: c.couponPercent ? `${c.couponPercent}%` : "", validade: coupon?.endsAt ? formatDate(coupon.endsAt) : "", loja: s.store.name };
    if (emailOk) {
      const send = await prisma.automationSend.create({ data: { flowId, customerId: r.id, email: r.email, channel: "EMAIL", dedupeKey: r.dedupeKey, couponCode: coupon?.code } });
      const utm = `utm_source=email&utm_medium=remarketing&utm_campaign=${flow.trigger.toLowerCase()}`;
      const recs = await recommendations(r.id);
      await sendMail({
        to: r.email, template: `flow:${flow.trigger}`, subject: fill(c.subject, vars), title: fill(c.subject, vars),
        paragraphs: [`Olá, ${vars.nome}.`, ...fill(c.body, vars).split(/\n{2,}/)],
        extraHtml: (coupon ? `<div style="margin:22px 0;padding:16px;border:1px dashed #c9a96e;text-align:center;font-family:monospace;font-size:22px;letter-spacing:4px">${coupon.code}</div><p style="font-size:12px;color:#888;text-align:center">Cupom pessoal de uso único · ${vars.desconto} · válido até ${vars.validade}</p>` : "")
          + productCards(recs, utm)
          + `<p style="font-size:11px;color:#999;margin-top:28px">Você recebe este e-mail porque autorizou comunicações da ${s.store.name}. <a href="${unsubUrl(r.email)}" style="color:#999">Descadastrar</a>.</p>`,
        cta: { label: c.ctaLabel ?? "Ver joias", url: `${appUrl()}/r/${send.id}` },
      });
      sent++;
    }
    if (waOk) {
      await prisma.automationSend.create({ data: { flowId, customerId: r.id, channel: "WHATSAPP", status: "QUEUED", dedupeKey: r.dedupeKey, couponCode: coupon?.code } });
      queued++;
    }
  }

  // lembretes: e-mail de passo 1 sem conversão, cupom não usado, após followUpDays
  let reminders = 0;
  if (c.followUpDays && c.reminderSubject) {
    const due = await prisma.automationSend.findMany({
      where: { flowId, step: 1, channel: "EMAIL", convertedOrderId: null, createdAt: { lt: new Date(Date.now() - c.followUpDays * DAY), gt: new Date(Date.now() - (c.followUpDays + 20) * DAY) } },
      include: { customer: { select: recipientSelect } }, take: batch,
    });
    for (const d of due) {
      if (!d.customer?.marketingOptIn) continue;
      if (await prisma.automationSend.findFirst({ where: { flowId, dedupeKey: d.dedupeKey, step: 2, channel: "EMAIL" } })) continue;
      const coupon = d.couponCode ? await prisma.coupon.findUnique({ where: { code: d.couponCode } }) : null;
      if (coupon && (coupon.usedCount > 0 || (coupon.endsAt && coupon.endsAt < new Date()))) continue;
      const vars = { nome: d.customer.name.split(" ")[0], cupom: coupon?.code ?? "", desconto: c.couponPercent ? `${c.couponPercent}%` : "", validade: coupon?.endsAt ? formatDate(coupon.endsAt) : "", loja: s.store.name };
      const send = await prisma.automationSend.create({ data: { flowId, customerId: d.customerId, email: d.customer.email, channel: "EMAIL", step: 2, dedupeKey: d.dedupeKey, couponCode: d.couponCode } });
      await sendMail({
        to: d.customer.email, template: `flow:${flow.trigger}:lembrete`, subject: fill(c.reminderSubject, vars), title: fill(c.reminderSubject, vars),
        paragraphs: [`Olá, ${vars.nome}.`, ...fill(c.reminderBody ?? "", vars).split(/\n{2,}/)],
        extraHtml: `<p style="font-size:11px;color:#999;margin-top:28px"><a href="${unsubUrl(d.customer.email)}" style="color:#999">Descadastrar</a>.</p>`,
        cta: { label: c.ctaLabel ?? "Ver joias", url: `${appUrl()}/r/${send.id}` },
      });
      reminders++;
    }
  }
  await prisma.automationFlow.update({ where: { id: flowId }, data: { lastRunAt: new Date(), ...(c.runOnce && sent + queued < batch ? { active: false } : {}) } });
  return { sent, queued, reminders };
}

export async function runAutomations() {
  const flows = await prisma.automationFlow.findMany({ where: { active: true } });
  const out: Record<string, unknown> = {};
  for (const f of flows) {
    try { out[f.name] = await runFlow(f.id); } catch (e) { out[f.name] = `erro: ${(e as Error).message}`; }
  }
  return out;
}

/** Atribui um pedido pago ao remarketing: pelo cupom do envio ou por clique em até 7 dias. */
export async function attributeOrder(order: { id: string; customerId: string | null; couponCode: string | null; totalCents: number; paidAt: Date | null }) {
  let send = order.couponCode ? await prisma.automationSend.findFirst({ where: { couponCode: order.couponCode, convertedOrderId: null }, orderBy: { step: "asc" } }) : null;
  if (!send && order.customerId) send = await prisma.automationSend.findFirst({ where: { customerId: order.customerId, convertedOrderId: null, clickedAt: { gt: new Date(Date.now() - 7 * DAY) } }, orderBy: { clickedAt: "desc" } });
  if (send) await prisma.automationSend.update({ where: { id: send.id }, data: { convertedOrderId: order.id, revenueCents: order.totalCents } });
}

export function whatsappLink(phone: string, text: string) {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}?text=${encodeURIComponent(text)}`;
}

export function fillTemplate(t: string, v: Record<string, string>) {
  return fill(t, v);
}
