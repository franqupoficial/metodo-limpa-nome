import "server-only";
import { prisma } from "./db";
import { randomToken } from "./crypto";
import { sendMail, appUrl } from "./mail";
import { getSettings } from "./settings";
import { formatMoney } from "./format";

/** Envia o e-mail de recuperação para um carrinho abandonado (somente com e-mail informado pelo cliente no checkout). */
export async function sendCartRecovery(cartId: string, force = false) {
  const cart = await prisma.cart.findUnique({ where: { id: cartId }, include: { items: { include: { variant: { include: { product: true } } } }, customer: true } });
  if (!cart || !cart.email || !cart.items.length || cart.status === "CONVERTED" || cart.recoveredAt) return false;
  if (cart.recoveryEmailAt && !force) return false;
  if (cart.customer?.anonymizedAt) return false;
  const token = cart.recoveryToken ?? randomToken(18);
  const total = cart.items.reduce((a, i) => a + (i.variant.priceCents ?? i.variant.product.priceCents) * i.quantity, 0);
  await sendMail({
    to: cart.email,
    template: "cart.recovery",
    subject: "Suas joias continuam reservadas no carrinho",
    title: "Você deixou algo especial para trás",
    paragraphs: [
      `Olá${cart.name ? `, ${cart.name.split(" ")[0]}` : ""}.`,
      `Guardamos o seu carrinho: ${cart.items.map((i) => i.variant.product.name).slice(0, 3).join(", ")}${cart.items.length > 3 ? " e mais" : ""} — total de ${formatMoney(total)}.`,
      "A disponibilidade das peças pode mudar. Finalize quando quiser pelo link abaixo.",
    ],
    cta: { label: "Retomar minha compra", url: `${appUrl()}/carrinho/recuperar/${token}` },
  });
  await prisma.cart.update({ where: { id: cart.id }, data: { recoveryToken: token, recoveryEmailAt: new Date(), status: "ABANDONED" } });
  return true;
}

/** Rotina: marca carrinhos inativos como abandonados e envia a recuperação (se habilitada). */
export async function processAbandonedCarts() {
  const s = await getSettings();
  const cutoff = new Date(Date.now() - s.marketing.cartRecoveryDelayHours * 3600_000);
  const carts = await prisma.cart.findMany({ where: { status: "ACTIVE", updatedAt: { lt: cutoff }, items: { some: {} } }, take: 100, select: { id: true, email: true } });
  let marked = 0, sent = 0;
  for (const c of carts) {
    if (s.marketing.cartRecoveryEnabled && c.email && (await sendCartRecovery(c.id))) sent++;
    else await prisma.cart.update({ where: { id: c.id }, data: { status: "ABANDONED" } });
    marked++;
  }
  return { marked, sent };
}
