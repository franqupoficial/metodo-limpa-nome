import "server-only";
import type { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "./db";

type Tx = Prisma.TransactionClient;

export class StockError extends Error {}

/**
 * Movimenta o estoque físico de uma variação e registra o histórico.
 * Usa UPDATE condicional para evitar saldo negativo mesmo com acessos simultâneos.
 */
export async function moveStock(
  tx: Tx,
  args: { variantId: string; type: StockMovementType; quantity: number; reason?: string; orderId?: string; adminId?: string; allowNegative?: boolean },
) {
  const { variantId, quantity } = args;
  if (!Number.isInteger(quantity) || quantity === 0) throw new StockError("Quantidade inválida.");
  const rows = args.allowNegative || quantity > 0
    ? await tx.$queryRaw<{ stock: number }[]>`UPDATE "ProductVariant" SET "stock" = "stock" + ${quantity}, "updatedAt" = now() WHERE "id" = ${variantId} RETURNING "stock"`
    : await tx.$queryRaw<{ stock: number }[]>`UPDATE "ProductVariant" SET "stock" = "stock" + ${quantity}, "updatedAt" = now() WHERE "id" = ${variantId} AND "stock" + ${quantity} >= "reserved" AND "stock" + ${quantity} >= 0 RETURNING "stock"`;
  if (!rows.length) throw new StockError("Estoque insuficiente para esta saída (considere as unidades reservadas em pedidos).");
  await tx.stockMovement.create({
    data: { variantId, type: args.type, quantity, stockAfter: rows[0].stock, reason: args.reason, orderId: args.orderId, adminId: args.adminId },
  });
  return rows[0].stock;
}

/** Define o saldo exato (inventário/ajuste), registrando a diferença. */
export async function setStock(tx: Tx, args: { variantId: string; counted: number; type: "INVENTORY" | "ADJUST"; reason?: string; adminId?: string }) {
  if (!Number.isInteger(args.counted) || args.counted < 0) throw new StockError("Quantidade contada inválida.");
  const v = await tx.productVariant.findUniqueOrThrow({ where: { id: args.variantId }, select: { stock: true } });
  const diff = args.counted - v.stock;
  if (diff === 0) return v.stock;
  return moveStock(tx, { variantId: args.variantId, type: args.type, quantity: diff, reason: args.reason, adminId: args.adminId, allowNegative: true });
}

/** Reserva unidades para um pedido aguardando pagamento. Falha se não houver disponível. */
export async function reserve(tx: Tx, items: { variantId: string; quantity: number; trackStock: boolean }[], orderId: string, allowBackorder: boolean) {
  for (const it of items) {
    if (!it.trackStock) continue;
    const rows = allowBackorder
      ? await tx.$queryRaw<{ stock: number }[]>`UPDATE "ProductVariant" SET "reserved" = "reserved" + ${it.quantity} WHERE "id" = ${it.variantId} RETURNING "stock"`
      : await tx.$queryRaw<{ stock: number }[]>`UPDATE "ProductVariant" SET "reserved" = "reserved" + ${it.quantity} WHERE "id" = ${it.variantId} AND "stock" - "reserved" >= ${it.quantity} AND "active" = true RETURNING "stock"`;
    if (!rows.length) throw new StockError("Um dos itens do carrinho não está mais disponível na quantidade escolhida.");
    await tx.stockMovement.create({ data: { variantId: it.variantId, type: "RESERVE", quantity: 0, reservedDiff: it.quantity, stockAfter: rows[0].stock, orderId, reason: "Reserva do pedido" } });
  }
}

async function orderLines(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId, variantId: { not: null } }, select: { variantId: true, quantity: true, product: { select: { trackStock: true } } } });
  return items.filter((i) => i.variantId && i.product?.trackStock !== false) as { variantId: string; quantity: number }[];
}

/** Pagamento confirmado: converte a reserva em baixa definitiva. Idempotente por pedido. */
export async function commitSale(tx: Tx, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { stockReserved: true } });
  const already = await tx.stockMovement.count({ where: { orderId, type: "SALE" } });
  if (already) return;
  for (const it of await orderLines(tx, orderId)) {
    const rows = order.stockReserved
      ? await tx.$queryRaw<{ stock: number }[]>`UPDATE "ProductVariant" SET "stock" = "stock" - ${it.quantity}, "reserved" = GREATEST(0, "reserved" - ${it.quantity}) WHERE "id" = ${it.variantId} RETURNING "stock"`
      : await tx.$queryRaw<{ stock: number }[]>`UPDATE "ProductVariant" SET "stock" = "stock" - ${it.quantity} WHERE "id" = ${it.variantId} RETURNING "stock"`;
    if (rows.length)
      await tx.stockMovement.create({ data: { variantId: it.variantId, type: "SALE", quantity: -it.quantity, reservedDiff: order.stockReserved ? -it.quantity : 0, stockAfter: rows[0].stock, orderId, reason: "Baixa por pagamento aprovado" } });
  }
  await tx.order.update({ where: { id: orderId }, data: { stockReserved: false } });
}

/** Pedido não pago cancelado/expirado: libera a reserva. */
export async function releaseReservation(tx: Tx, orderId: string, reason = "Liberação de reserva") {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { stockReserved: true } });
  if (!order.stockReserved) return;
  for (const it of await orderLines(tx, orderId)) {
    const rows = await tx.$queryRaw<{ stock: number }[]>`UPDATE "ProductVariant" SET "reserved" = GREATEST(0, "reserved" - ${it.quantity}) WHERE "id" = ${it.variantId} RETURNING "stock"`;
    if (rows.length) await tx.stockMovement.create({ data: { variantId: it.variantId, type: "RELEASE", quantity: 0, reservedDiff: -it.quantity, stockAfter: rows[0].stock, orderId, reason } });
  }
  await tx.order.update({ where: { id: orderId }, data: { stockReserved: false } });
}

/** Cancelamento/reembolso de pedido já baixado: devolve ao estoque (somente se a peça voltou à loja). */
export async function returnSale(tx: Tx, orderId: string, adminId?: string, reason = "Estorno de venda") {
  const sold = await tx.stockMovement.count({ where: { orderId, type: "SALE" } });
  const returned = await tx.stockMovement.count({ where: { orderId, type: "RETURN" } });
  if (!sold || returned) return false;
  for (const it of await orderLines(tx, orderId)) {
    await moveStock(tx, { variantId: it.variantId, type: "RETURN", quantity: it.quantity, orderId, adminId, reason });
  }
  return true;
}

export const available = (v: { stock: number; reserved: number }) => Math.max(0, v.stock - v.reserved);

export async function lowStockVariants(limit = 50) {
  return prisma.$queryRaw<{ id: string; sku: string; option: string | null; stock: number; reserved: number; minStock: number; productId: string; name: string }[]>`
    SELECT v."id", v."sku", v."option", v."stock", v."reserved", v."minStock", p."id" AS "productId", p."name"
    FROM "ProductVariant" v JOIN "Product" p ON p."id" = v."productId"
    WHERE v."active" = true AND p."status" = 'ACTIVE' AND p."trackStock" = true AND (v."stock" - v."reserved") <= v."minStock"
    ORDER BY (v."stock" - v."reserved") ASC, p."name" ASC LIMIT ${limit}`;
}
