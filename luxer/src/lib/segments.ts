import type { Prisma } from "@prisma/client";

export type SegmentRules = {
  minOrders?: number;
  maxOrders?: number;
  minSpentCents?: number;
  inactiveDays?: number;
  sinceDays?: number;
  categoryIds?: string[];
  optIn?: boolean;
};

/** Segmentos prontos do CRM. */
export const BUILTIN_SEGMENTS: Record<string, { name: string; description: string; rules: SegmentRules }> = {
  novos: { name: "Novos clientes", description: "Primeira compra nos últimos 30 dias", rules: { minOrders: 1, maxOrders: 1, sinceDays: 30 } },
  recorrentes: { name: "Clientes recorrentes", description: "2 ou mais pedidos pagos", rules: { minOrders: 2 } },
  "alto-valor": { name: "Alto valor", description: "Gasto acumulado a partir de R$ 10.000", rules: { minSpentCents: 1_000_000 } },
  inativos: { name: "Inativos", description: "Compraram, mas não voltam há 180 dias", rules: { minOrders: 1, inactiveDays: 180 } },
  "sem-compra": { name: "Cadastrados sem compra", description: "Conta criada sem pedido pago", rules: { maxOrders: 0 } },
  "aceitam-marketing": { name: "Aceitam marketing", description: "Consentimento de comunicação ativo", rules: { optIn: true } },
};

export function segmentWhere(r: SegmentRules, now = new Date()): Prisma.CustomerWhereInput {
  const day = 86_400_000;
  return {
    anonymizedAt: null,
    AND: [
      r.minOrders != null ? { ordersCount: { gte: r.minOrders } } : {},
      r.maxOrders != null ? { ordersCount: { lte: r.maxOrders } } : {},
      r.minSpentCents != null ? { totalSpentCents: { gte: r.minSpentCents } } : {},
      r.inactiveDays != null ? { lastOrderAt: { lt: new Date(now.getTime() - r.inactiveDays * day) } } : {},
      r.sinceDays != null ? { firstOrderAt: { gte: new Date(now.getTime() - r.sinceDays * day) } } : {},
      r.optIn ? { marketingOptIn: true } : {},
      r.categoryIds?.length ? { orders: { some: { status: { in: ["PAID", "PICKING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"] }, items: { some: { categoryIds: { hasSome: r.categoryIds } } } } } } : {},
    ],
  };
}
