import "server-only";
import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { commitSale, releaseReservation, returnSale } from "./stock";
import { orderMails } from "./mail";
import { notify } from "./notifications";
import { ORDER_STATUS_LABEL, canTransition, REVENUE_STATUSES } from "./order-status";
import * as pagarme from "./payments/pagarme";
import { correiosTrackingUrl } from "./shipping";
import { attributeOrder } from "./remarketing";

type Actor = { id: string; name: string } | null;

const withItems = { items: true } satisfies Prisma.OrderInclude;

export async function addEvent(orderId: string, type: string, message: string, actor: Actor, opts: { internal?: boolean; meta?: Record<string, unknown> } = {}) {
  await prisma.orderEvent.create({
    data: { orderId, type, message, adminId: actor?.id, adminName: actor?.name, internal: opts.internal ?? true, meta: opts.meta as object | undefined },
  });
}

/**
 * Aplica a atualização de pagamento vinda do gateway (webhook ou sincronização).
 * Idempotente: pode ser chamada várias vezes com o mesmo estado.
 */
export async function applyPaymentUpdate(paymentId: string, charge: pagarme.PgCharge | null, orderStatusFromGateway?: string) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
  const newStatus: PaymentStatus = charge ? pagarme.mapChargeStatus(charge.status) : orderStatusFromGateway === "paid" ? "PAID" : payment.status;
  const tx = charge?.last_transaction;
  const refunded = charge?.canceled_amount ?? 0;
  const finalStatus: PaymentStatus = newStatus === "CANCELED" && payment.status === "PAID" ? (refunded && refunded < payment.amountCents ? "PARTIALLY_REFUNDED" : "REFUNDED") : newStatus;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: finalStatus,
      providerChargeId: charge?.id ?? payment.providerChargeId,
      paidAt: finalStatus === "PAID" && !payment.paidAt ? (charge?.paid_at ? new Date(charge.paid_at) : new Date()) : payment.paidAt,
      cardBrand: tx?.card?.brand ?? payment.cardBrand,
      cardLast4: tx?.card?.last_four_digits ?? payment.cardLast4,
      failureReason: finalStatus === "FAILED" ? pagarme.failureMessage(charge ?? undefined) : payment.failureReason,
      refundedCents: refunded || payment.refundedCents,
      raw: charge ? (JSON.parse(JSON.stringify(charge)) as object) : undefined,
    },
  });

  const order = payment.order;
  if (finalStatus === "PAID" && order.status === "AWAITING_PAYMENT") {
    await markPaid(order.id);
  } else if ((finalStatus === "FAILED" || finalStatus === "CANCELED") && order.status === "AWAITING_PAYMENT") {
    await prisma.$transaction(async (t) => {
      await releaseReservation(t, order.id, "Pagamento não aprovado");
      await t.order.update({ where: { id: order.id }, data: { status: "CANCELED", paymentStatus: finalStatus, canceledAt: new Date() } });
      if (order.couponCode) await t.coupon.updateMany({ where: { code: order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    });
    await addEvent(order.id, "payment", finalStatus === "FAILED" ? `Pagamento recusado${pagarme.failureMessage(charge ?? undefined) ? `: ${pagarme.failureMessage(charge ?? undefined)}` : ""}.` : "Pagamento cancelado/expirado no gateway.", null, { internal: false });
  } else if ((finalStatus === "REFUNDED" || finalStatus === "PARTIALLY_REFUNDED") && order.paymentStatus !== finalStatus) {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: finalStatus, ...(finalStatus === "REFUNDED" ? { status: "REFUNDED" as OrderStatus } : {}) } });
    await addEvent(order.id, "payment", finalStatus === "REFUNDED" ? "Reembolso confirmado pelo gateway." : "Reembolso parcial confirmado pelo gateway.", null);
  } else if (order.paymentStatus !== finalStatus && order.status !== "CANCELED") {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: finalStatus } });
  }
}

/** Pagamento aprovado: baixa estoque, atualiza métricas do cliente, avisa o cliente e a equipe. */
export async function markPaid(orderId: string) {
  const updated = await prisma.$transaction(async (t) => {
    const r = await t.order.updateMany({ where: { id: orderId, status: "AWAITING_PAYMENT" }, data: { status: "PAID", paymentStatus: "PAID", paidAt: new Date() } });
    if (!r.count) return null;
    await commitSale(t, orderId);
    const o = await t.order.findUniqueOrThrow({ where: { id: orderId }, include: withItems });
    for (const it of o.items) if (it.productId) await t.product.update({ where: { id: it.productId }, data: { salesCount: { increment: it.quantity } } });
    if (o.customerId) {
      const c = await t.customer.findUniqueOrThrow({ where: { id: o.customerId } });
      await t.customer.update({
        where: { id: c.id },
        data: { ordersCount: { increment: 1 }, totalSpentCents: { increment: o.totalCents }, lastOrderAt: o.paidAt, firstOrderAt: c.firstOrderAt ?? o.paidAt },
      });
    }
    return o;
  });
  if (!updated) return;
  await addEvent(orderId, "payment", "Pagamento aprovado.", null, { internal: false });
  await attributeOrder(updated).catch((e) => console.error("[remarketing] atribuição", e));
  await orderMails.paid(updated);
  await notify("orders", `Novo pedido pago #${updated.number}`, `${updated.name} · ${(updated.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, `/admin/pedidos/${updated.id}`);
}

export async function changeStatus(orderId: string, to: OrderStatus, actor: Actor, note?: string, tracking?: { code?: string; url?: string; carrier?: string }) {
  const o = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: withItems });
  if (!canTransition(o.status, to)) throw new Error(`Não é possível mudar de "${ORDER_STATUS_LABEL[o.status]}" para "${ORDER_STATUS_LABEL[to]}".`);
  if (to === "CANCELED") throw new Error("Use a ação de cancelamento.");
  if (to === "SHIPPED" && !(tracking?.code || o.trackingCode)) throw new Error("Informe o código de rastreamento para marcar como enviado.");
  const trackingCode = tracking?.code || o.trackingCode;
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: to,
      trackingCode,
      trackingUrl: tracking?.url || o.trackingUrl || (trackingCode && /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(trackingCode) ? correiosTrackingUrl(trackingCode) : null),
      shippingCarrier: tracking?.carrier || o.shippingCarrier,
      shippedAt: to === "SHIPPED" ? o.shippedAt ?? new Date() : o.shippedAt,
      deliveredAt: to === "DELIVERED" ? new Date() : to === "SHIPPED" ? null : o.deliveredAt,
    },
    include: withItems,
  });
  await addEvent(orderId, "status", `Status alterado para "${ORDER_STATUS_LABEL[to]}".${note ? ` ${note}` : ""}`, actor, { internal: false });
  if (to === "SHIPPED" && o.status !== "SHIPPED") await orderMails.shipped(updated);
  if (to === "DELIVERED") await orderMails.delivered(updated);
  return updated;
}

/**
 * Cancela o pedido.
 * - Não pago: libera a reserva de estoque e cancela a cobrança pendente no gateway.
 * - Pago: exige reembolso no gateway (permissão orders.refund) e, se a peça estiver na loja, devolve ao estoque.
 */
export async function cancelOrder(orderId: string, actor: Actor, opts: { reason: string; refund: boolean; restock: boolean }) {
  const o = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { ...withItems, payments: true } });
  if (o.status === "CANCELED" || o.status === "REFUNDED") throw new Error("Pedido já cancelado.");
  if (o.status === "SHIPPED" || o.status === "DELIVERED") throw new Error("Pedido já enviado: registre a devolução e faça o reembolso.");
  const paid = REVENUE_STATUSES.includes(o.status);
  let refundedCents = 0;

  if (paid && !opts.refund) throw new Error("Pedido pago: o cancelamento exige o reembolso ao cliente.");
  for (const p of o.payments) {
    if (!p.providerChargeId || !pagarme.pagarmeConfigured()) continue;
    if (p.status === "PENDING" || p.status === "AUTHORIZED") {
      await pagarme.cancelCharge(p.providerChargeId).catch((e) => console.error("[cancel] cobrança pendente", e));
      await prisma.payment.update({ where: { id: p.id }, data: { status: "CANCELED" } });
    } else if (p.status === "PAID" && opts.refund) {
      const remaining = p.amountCents - p.refundedCents;
      const ch = await pagarme.cancelCharge(p.providerChargeId, remaining);
      refundedCents += remaining;
      await prisma.payment.update({ where: { id: p.id }, data: { status: "REFUNDED", refundedCents: p.amountCents, raw: JSON.parse(JSON.stringify(ch)) } });
    }
  }
  if (paid && opts.refund && refundedCents === 0) throw new Error("Não há cobrança paga reembolsável no gateway para este pedido. Verifique o pagamento antes de cancelar.");

  await prisma.$transaction(async (t) => {
    await releaseReservation(t, o.id, "Pedido cancelado");
    if (paid && opts.restock) await returnSale(t, o.id, actor?.id, "Cancelamento com retorno ao estoque");
    await t.order.update({
      where: { id: o.id },
      data: { status: paid ? "REFUNDED" : "CANCELED", paymentStatus: paid ? "REFUNDED" : "CANCELED", canceledAt: new Date() },
    });
    if (o.couponCode && !paid) await t.coupon.updateMany({ where: { code: o.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    if (paid && o.customerId) {
      await t.customer.update({ where: { id: o.customerId }, data: { ordersCount: { decrement: 1 }, totalSpentCents: { decrement: o.totalCents } } });
    }
    if (paid) for (const it of o.items) if (it.productId) await t.product.update({ where: { id: it.productId }, data: { salesCount: { decrement: it.quantity } } });
  });
  await addEvent(o.id, "status", `Pedido cancelado. Motivo: ${opts.reason}${refundedCents ? ` · Reembolso de ${(refundedCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} solicitado ao gateway` : ""}${opts.restock ? " · Itens devolvidos ao estoque" : ""}.`, actor, { internal: false });
  await orderMails.canceled(o, opts.reason);
  if (refundedCents) await orderMails.refunded(o, refundedCents);
}

/** Consulta o gateway e aplica o estado atual (botão "sincronizar" e rotina periódica). */
export async function syncPayment(paymentId: string) {
  const p = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (!p.providerOrderId) return;
  const pg = await pagarme.getOrder(p.providerOrderId);
  await applyPaymentUpdate(p.id, pg.charges?.[0] ?? null, pg.status);
}

/** Expira pedidos Pix não pagos e libera o estoque reservado. */
export async function expireStaleOrders() {
  const stale = await prisma.order.findMany({
    where: { status: "AWAITING_PAYMENT", reservationExpires: { lt: new Date() } },
    include: { payments: true },
    take: 100,
  });
  let n = 0;
  for (const o of stale) {
    // antes de expirar, confirma no gateway que não houve pagamento
    const pay = o.payments[0];
    if (pay?.providerOrderId && pagarme.pagarmeConfigured()) {
      try {
        await syncPayment(pay.id);
        const fresh = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
        if (fresh.status !== "AWAITING_PAYMENT") continue;
      } catch (e) {
        console.error("[expirar] falha ao consultar gateway", e);
        continue;
      }
    }
    await cancelOrder(o.id, null, { reason: "Prazo de pagamento expirado", refund: false, restock: false });
    n++;
  }
  return n;
}
