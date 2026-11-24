import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { REVENUE_STATUSES } from "./order-status";
import { lowStockVariants } from "./stock";

const TZ = "America/Sao_Paulo";
const DAY = 86_400_000;

export type Period = { key: string; label: string; from: Date; to: Date; prevFrom: Date; prevTo: Date };

/** Início do dia em Brasília (UTC-3, sem horário de verão desde 2019). */
function spDayStart(d: Date) {
  const local = new Date(d.getTime() - 3 * 3600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + 3 * 3600_000);
}

export function parsePeriod(p: { periodo?: string; de?: string; ate?: string }, now = new Date()): Period {
  const today = spDayStart(now);
  const tomorrow = new Date(today.getTime() + DAY);
  let from: Date, to: Date, label: string, key = p.periodo || "30d";
  switch (key) {
    case "hoje": from = today; to = tomorrow; label = "Hoje"; break;
    case "ontem": from = new Date(today.getTime() - DAY); to = today; label = "Ontem"; break;
    case "7d": from = new Date(tomorrow.getTime() - 7 * DAY); to = tomorrow; label = "Últimos 7 dias"; break;
    case "90d": from = new Date(tomorrow.getTime() - 90 * DAY); to = tomorrow; label = "Últimos 90 dias"; break;
    case "mes": {
      const local = new Date(now.getTime() - 3 * 3600_000);
      from = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) + 3 * 3600_000); to = tomorrow; label = "Este mês"; break;
    }
    case "custom": {
      const a = p.de ? new Date(`${p.de}T00:00:00-03:00`) : null;
      const b = p.ate ? new Date(`${p.ate}T00:00:00-03:00`) : null;
      if (a && b && !Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && a <= b) {
        from = a; to = new Date(b.getTime() + DAY); label = "Personalizado"; break;
      }
      key = "30d";
    }
    // fallthrough
    default: key = "30d"; from = new Date(tomorrow.getTime() - 30 * DAY); to = tomorrow; label = "Últimos 30 dias";
  }
  const len = to.getTime() - from.getTime();
  return { key, label, from, to, prevFrom: new Date(from.getTime() - len), prevTo: from };
}

export const pctDelta = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

const revenueWhere = (from: Date, to: Date): Prisma.OrderWhereInput => ({ paidAt: { gte: from, lt: to }, status: { in: REVENUE_STATUSES } });

async function salesSummary(from: Date, to: Date) {
  const a = await prisma.order.aggregate({ where: revenueWhere(from, to), _sum: { totalCents: true, discountCents: true, shippingCents: true }, _count: true });
  const revenue = a._sum.totalCents ?? 0;
  return { revenue, orders: a._count, ticket: a._count ? Math.round(revenue / a._count) : 0, discount: a._sum.discountCents ?? 0, shipping: a._sum.shippingCents ?? 0 };
}

async function visitors(from: Date, to: Date) {
  return prisma.dailyVisit.count({ where: { day: { gte: from, lt: to } } });
}

export async function dashboard(period: Period) {
  const now = new Date();
  const today = spDayStart(now);
  const localNow = new Date(now.getTime() - 3 * 3600_000);
  const monthStart = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), 1) + 3 * 3600_000);

  const [cur, prev, day, month, statusCounts, visits, prevVisits] = await Promise.all([
    salesSummary(period.from, period.to),
    salesSummary(period.prevFrom, period.prevTo),
    salesSummary(today, new Date(today.getTime() + DAY)),
    salesSummary(monthStart, new Date(today.getTime() + DAY)),
    prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: period.from, lt: period.to } }, _count: true }),
    visitors(period.from, period.to),
    visitors(period.prevFrom, period.prevTo),
  ]);
  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count])) as Record<string, number>;
  const openNow = await prisma.order.groupBy({ by: ["status"], where: { status: { in: ["AWAITING_PAYMENT", "PAID", "PICKING", "READY_TO_SHIP"] } }, _count: true });

  // série diária (atual e anterior alinhadas por índice do dia)
  const series = async (from: Date, to: Date) =>
    prisma.$queryRaw<{ d: Date; total: bigint; n: bigint }[]>`
      SELECT date_trunc('day', "paidAt" AT TIME ZONE ${TZ}) AS d, SUM("totalCents")::bigint AS total, COUNT(*)::bigint AS n
      FROM "Order" WHERE "paidAt" >= ${from} AND "paidAt" < ${to} AND "status"::text = ANY(${REVENUE_STATUSES as string[]})
      GROUP BY 1 ORDER BY 1`;
  const days = Math.max(1, Math.round((period.to.getTime() - period.from.getTime()) / DAY));
  const [sCur, sPrev] = await Promise.all([series(period.from, period.to), series(period.prevFrom, period.prevTo)]);
  const bucket = (rows: { d: Date; total: bigint }[], start: Date) => {
    const arr = Array(days).fill(0) as number[];
    const startLocal = new Date(start.getTime() - 3 * 3600_000);
    const base = Date.UTC(startLocal.getUTCFullYear(), startLocal.getUTCMonth(), startLocal.getUTCDate());
    for (const r of rows) {
      const idx = Math.round((r.d.getTime() - base) / DAY);
      if (idx >= 0 && idx < days) arr[idx] += Number(r.total);
    }
    return arr;
  };
  const curArr = bucket(sCur, period.from);
  const prevArr = bucket(sPrev, period.prevFrom);
  const chart = curArr.map((v, i) => ({
    label: new Date(period.from.getTime() + i * DAY).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ }),
    current: v,
    previous: prevArr[i] ?? 0,
  }));

  const topProducts = await prisma.$queryRaw<{ productId: string; name: string; qty: bigint; total: bigint }[]>`
    SELECT i."productId", MAX(i."name") AS name, SUM(i."quantity")::bigint AS qty, SUM(i."totalCents")::bigint AS total
    FROM "OrderItem" i JOIN "Order" o ON o."id" = i."orderId"
    WHERE o."paidAt" >= ${period.from} AND o."paidAt" < ${period.to} AND o."status"::text = ANY(${REVENUE_STATUSES as string[]}) AND i."productId" IS NOT NULL
    GROUP BY i."productId" ORDER BY qty DESC, total DESC LIMIT 8`;

  const byCategory = await prisma.$queryRaw<{ name: string; total: bigint }[]>`
    SELECT c."name", SUM(i."totalCents")::bigint AS total
    FROM "OrderItem" i JOIN "Order" o ON o."id" = i."orderId"
    JOIN "Category" c ON c."id" = ANY(i."categoryIds") AND c."parentId" IS NULL
    WHERE o."paidAt" >= ${period.from} AND o."paidAt" < ${period.to} AND o."status"::text = ANY(${REVENUE_STATUSES as string[]})
    GROUP BY c."name" ORDER BY total DESC LIMIT 10`;

  const [newCustomers, recurring, abandoned, lowStock] = await Promise.all([
    prisma.customer.count({ where: { firstOrderAt: { gte: period.from, lt: period.to } } }),
    prisma.customer.count({ where: { lastOrderAt: { gte: period.from, lt: period.to }, ordersCount: { gte: 2 } } }),
    prisma.cart.count({ where: { status: "ABANDONED", updatedAt: { gte: period.from, lt: period.to } } }),
    lowStockVariants(8),
  ]);

  return {
    cur, prev, day, month, byStatus,
    open: Object.fromEntries(openNow.map((s) => [s.status, s._count])) as Record<string, number>,
    visits, prevVisits,
    /** conversão só é exibida com amostra mínima de visitantes */
    conversion: visits >= 50 ? (cur.orders / visits) * 100 : null,
    prevConversion: prevVisits >= 50 ? (prev.orders / prevVisits) * 100 : null,
    chart, topProducts: topProducts.map((t) => ({ ...t, qty: Number(t.qty), total: Number(t.total) })),
    byCategory: byCategory.map((c) => ({ name: c.name, total: Number(c.total) })),
    newCustomers, recurring, abandoned, lowStock,
  };
}
