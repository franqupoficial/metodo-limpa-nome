import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { parsePeriod } from "@/lib/reports";
import { csvResponse, csvMoney } from "@/lib/csv";

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin?.can("finance.export")) return new Response("Acesso negado", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const p = parsePeriod(sp);
  const rows = await prisma.payment.findMany({ where: { createdAt: { gte: p.from, lt: p.to } }, orderBy: { createdAt: "asc" }, include: { order: { select: { number: true } } } });
  await audit(admin.id, "finance.export_csv", "Payment", undefined, { meta: { period: p.label, rows: rows.length } });
  return csvResponse("transacoes-luxer", "data;pedido;forma;parcelas;status;valor;taxa;liquido;reembolsado;pago_em;repasse;id_gateway", rows.map((t) => [t.createdAt.toISOString(), t.order.number, t.method, t.installments, t.status, csvMoney(t.amountCents), csvMoney(t.feeCents), csvMoney(t.netCents), csvMoney(t.refundedCents), t.paidAt?.toISOString() ?? "", t.expectedPayoutAt?.toISOString().slice(0, 10) ?? "", t.providerChargeId ?? ""]));
}
