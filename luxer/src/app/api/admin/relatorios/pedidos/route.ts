import type { Prisma, OrderStatus } from "@prisma/client";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { csvResponse, csvMoney } from "@/lib/csv";
import { OPEN_FULFILLMENT } from "@/lib/order-status";

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin?.can("finance.export") && !admin?.can("reports.view")) return new Response("Acesso negado", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const st = sp.get("status");
  const where: Prisma.OrderWhereInput = {
    AND: [
      st === "abertos" ? { status: { in: OPEN_FULFILLMENT } } : st ? { status: st as OrderStatus } : {},
      sp.get("de") ? { createdAt: { gte: new Date(`${sp.get("de")}T00:00:00-03:00`) } } : {},
      sp.get("ate") ? { createdAt: { lt: new Date(new Date(`${sp.get("ate")}T00:00:00-03:00`).getTime() + 86400000) } } : {},
    ],
  };
  const rows = await prisma.order.findMany({ where, orderBy: { createdAt: "asc" }, take: 20000 });
  await audit(admin.id, "orders.export_csv", "Order", undefined, { meta: { rows: rows.length } });
  return csvResponse("pedidos-luxer", "numero;data;status;pagamento;forma;parcelas;cliente;email;cidade;uf;subtotal;descontos;frete;juros;total;cupom;envio;rastreio;pago_em", rows.map((o) => [o.number, o.createdAt.toISOString(), o.status, o.paymentStatus, o.paymentMethod, o.installments, o.name, o.email, o.shipCity, o.shipState, csvMoney(o.subtotalCents), csvMoney(o.discountCents), csvMoney(o.shippingCents), csvMoney(o.interestCents), csvMoney(o.totalCents), o.couponCode, o.shippingService, o.trackingCode, o.paidAt?.toISOString() ?? ""]));
}
