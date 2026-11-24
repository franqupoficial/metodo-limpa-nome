import type { OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL, OPEN_FULFILLMENT } from "@/lib/order-status";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Lista de separação", robots: { index: false } };

export default async function PrintList({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin("orders.view");
  const { status } = await searchParams;
  const orders = await prisma.order.findMany({
    where: status === "abertos" || !status ? { status: { in: OPEN_FULFILLMENT } } : { status: status as OrderStatus },
    orderBy: { createdAt: "asc" }, take: 200, include: { items: true },
  });
  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-sm text-black">
      <div className="mb-4 flex items-center justify-between"><h1 className="text-xl font-semibold">Lista de separação — {orders.length} pedido(s)</h1><PrintButton /></div>
      {orders.map((o) => (
        <div key={o.id} className="mb-4 break-inside-avoid border p-3">
          <div className="flex justify-between font-semibold"><span>#{o.number} · {o.name}</span><span>{ORDER_STATUS_LABEL[o.status]} · {formatDate(o.createdAt)}</span></div>
          <ul className="mt-1">{o.items.map((i) => <li key={i.id}>☐ {i.quantity}× {i.name}{i.option ? ` — ${i.option}` : ""} <span className="font-mono text-xs">({i.sku})</span></li>)}</ul>
          <div className="mt-1 text-xs">{o.shippingService} · {o.shipCity}/{o.shipState} · {formatMoney(o.totalCents)}</div>
        </div>
      ))}
    </div>
  );
}
