import "server-only";
import { prisma } from "./db";
import { expireStaleOrders } from "./orders";
import { processAbandonedCarts } from "./cart-recovery";
import { processCampaigns } from "./campaigns";
import { lowStockVariants } from "./stock";
import { notify } from "./notifications";
import { deleteObject } from "./storage";
import { rateLimit } from "./rate-limit";
import { runAutomations } from "./remarketing";

/** Rotinas periódicas (agendar a cada 15 minutos). Cada etapa é independente: uma falha não interrompe as outras. */
export async function runJobs() {
  const out: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try { out[name] = await fn(); } catch (e) { out[name] = `erro: ${(e as Error).message}`; console.error(`[jobs] ${name}`, e); }
  };
  await step("pedidosExpirados", expireStaleOrders);
  await step("carrinhos", processAbandonedCarts);
  await step("campanhas", () => processCampaigns());
  await step("remarketing", runAutomations);
  await step("estoqueBaixo", async () => {
    // alerta no máximo 1x a cada 12h
    if (!(await rateLimit("job:lowstock", 1, 43200))) return "aguardando";
    const low = await lowStockVariants(200);
    if (low.length) await notify("stock", `${low.length} item(ns) com estoque baixo`, low.slice(0, 5).map((l) => `${l.name} (${l.sku}): ${l.stock - l.reserved}`).join(" · "), "/admin/estoque?filtro=baixo");
    return low.length;
  });
  await step("provadorRetencao", async () => {
    const old = await prisma.tryOnRequest.findMany({ where: { resultKey: { not: null }, resultExpiresAt: { lt: new Date() } }, take: 200 });
    for (const r of old) { await deleteObject(r.resultKey!).catch(() => {}); await prisma.tryOnRequest.update({ where: { id: r.id }, data: { resultKey: null } }); }
    return old.length;
  });
  await step("limpeza", async () => {
    const d = (n: number) => new Date(Date.now() - n * 86_400_000);
    const [s1, s2, t, rl, c] = await Promise.all([
      prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      prisma.customerSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      prisma.customerToken.deleteMany({ where: { expiresAt: { lt: d(1) } } }),
      prisma.rateLimit.deleteMany({ where: { windowStart: { lt: d(2) } } }),
      prisma.cart.deleteMany({ where: { status: { in: ["ABANDONED", "ACTIVE"] }, updatedAt: { lt: d(120) } } }),
    ]);
    return { sessoes: s1.count + s2.count, tokens: t.count, rateLimit: rl.count, carrinhosAntigos: c.count };
  });
  return out;
}
