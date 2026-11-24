import "server-only";
import { prisma } from "./db";
import { REVENUE_STATUSES } from "./order-status";
import * as pagarme from "./payments/pagarme";

/**
 * Indicadores financeiros. Separação deliberada:
 * - FATURAMENTO: valor dos pedidos com pagamento confirmado (o que o cliente pagou).
 * - RECEBIMENTO: o que o gateway repassa (faturamento − reembolsos − taxas), por data de repasse.
 * - LUCRO: só é estimado quando há custo cadastrado nos produtos; nunca confundido com faturamento.
 */
export async function financeSummary(from: Date, to: Date) {
  const paidOrders = await prisma.order.findMany({
    where: { paidAt: { gte: from, lt: to }, status: { in: [...REVENUE_STATUSES, "REFUNDED"] } },
    select: { id: true, totalCents: true, discountCents: true, shippingCents: true, interestCents: true, subtotalCents: true, items: { select: { productId: true, quantity: true, totalCents: true } }, payments: { select: { feeCents: true, refundedCents: true, status: true, netCents: true } } },
  });
  const gross = paidOrders.reduce((a, o) => a + o.totalCents, 0);
  const discounts = paidOrders.reduce((a, o) => a + o.discountCents, 0);
  const shipping = paidOrders.reduce((a, o) => a + o.shippingCents, 0);
  const interest = paidOrders.reduce((a, o) => a + o.interestCents, 0);
  const refunds = paidOrders.reduce((a, o) => a + o.payments.reduce((b, p) => b + p.refundedCents, 0), 0);
  const pays = paidOrders.flatMap((o) => o.payments.filter((p) => p.status !== "FAILED" && p.status !== "CANCELED"));
  const feesKnown = pays.filter((p) => p.feeCents != null);
  const fees = feesKnown.reduce((a, p) => a + (p.feeCents ?? 0), 0);
  const net = gross - refunds;

  // custo dos produtos vendidos (somente produtos com custo cadastrado)
  const productIds = [...new Set(paidOrders.flatMap((o) => o.items.map((i) => i.productId)).filter(Boolean) as string[])];
  const costs = Object.fromEntries((await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, costCents: true } })).map((p) => [p.id, p.costCents]));
  let cogs = 0, revenueWithCost = 0, itemsWithoutCost = 0;
  for (const o of paidOrders) for (const i of o.items) {
    const c = i.productId ? costs[i.productId] : null;
    if (c == null) { itemsWithoutCost += i.quantity; continue; }
    cogs += c * i.quantity;
    revenueWithCost += i.totalCents;
  }

  const [pending, receivedAgg, toReceiveAgg] = await Promise.all([
    prisma.order.aggregate({ where: { status: "AWAITING_PAYMENT" }, _sum: { totalCents: true }, _count: true }),
    prisma.payment.aggregate({ where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, expectedPayoutAt: { gte: from, lt: to, lte: new Date() } }, _sum: { netCents: true } }),
    prisma.payment.aggregate({ where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, expectedPayoutAt: { gt: new Date() } }, _sum: { netCents: true } }),
  ]);
  const unreconciled = await prisma.payment.count({ where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, reconciledAt: null, providerChargeId: { not: null } } });

  return {
    orders: paidOrders.length, gross, discounts, shipping, interest, refunds, net,
    fees, feesKnownCount: feesKnown.length, paymentsCount: pays.length,
    ticket: paidOrders.length ? Math.round(gross / paidOrders.length) : 0,
    cogs, revenueWithCost, itemsWithoutCost, grossMargin: revenueWithCost ? revenueWithCost - cogs : null,
    pendingCents: pending._sum.totalCents ?? 0, pendingCount: pending._count,
    receivedCents: receivedAgg._sum.netCents ?? 0, toReceiveCents: toReceiveAgg._sum.netCents ?? 0, unreconciled,
  };
}

/** Busca taxas e datas de repasse na Pagar.me para pagamentos ainda não conciliados. */
export async function reconcilePayments(limit = 40) {
  if (!pagarme.pagarmeConfigured()) throw new Error("Pagar.me não configurada.");
  const list = await prisma.payment.findMany({ where: { status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] }, reconciledAt: null, providerChargeId: { not: null } }, take: limit, orderBy: { paidAt: "asc" } });
  let ok = 0, waiting = 0;
  for (const p of list) {
    const payables = await pagarme.getPayables(p.providerChargeId!);
    if (!payables.length) { waiting++; continue; }
    const fee = payables.reduce((a, x) => a + (x.fee ?? 0) + (x.anticipation_fee ?? 0) + (x.fraud_coverage_fee ?? 0), 0);
    const gross = payables.filter((x) => x.type !== "refund" && x.type !== "chargeback").reduce((a, x) => a + x.amount, 0);
    const negatives = payables.filter((x) => x.type === "refund" || x.type === "chargeback").reduce((a, x) => a + Math.abs(x.amount), 0);
    const last = payables.map((x) => x.payment_date).filter(Boolean).sort().at(-1);
    await prisma.payment.update({ where: { id: p.id }, data: { feeCents: fee, netCents: gross - fee - negatives, expectedPayoutAt: last ? new Date(last) : null, reconciledAt: new Date() } });
    ok++;
  }
  return { ok, waiting, total: list.length };
}
