import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { parsePeriod } from "@/lib/reports";
import { REVENUE_STATUSES } from "@/lib/order-status";
import { csvResponse, csvMoney } from "@/lib/csv";

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin?.can("reports.view")) return new Response("Acesso negado", { status: 403 });
  const p = parsePeriod(Object.fromEntries(new URL(req.url).searchParams));
  const rows = await prisma.$queryRaw<{ name: string; sku: string; qty: bigint; total: bigint }[]>`
    SELECT MAX(i."name") name, i."sku", SUM(i."quantity")::bigint qty, SUM(i."totalCents")::bigint total FROM "OrderItem" i JOIN "Order" o ON o."id"=i."orderId"
    WHERE o."paidAt" >= ${p.from} AND o."paidAt" < ${p.to} AND o."status"::text = ANY(${REVENUE_STATUSES as string[]}) GROUP BY i."sku" ORDER BY total DESC`;
  await audit(admin.id, "reports.export_products", "Report", undefined, { meta: { period: p.label } });
  return csvResponse("vendas-por-produto", "produto;sku;quantidade;faturamento", rows.map((r) => [r.name, r.sku, Number(r.qty), csvMoney(Number(r.total))]));
}
