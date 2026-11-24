import Link from "next/link";
import type { Prisma, OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_STATUS_LABEL, PAYMENT_METHOD_LABEL, OPEN_FULFILLMENT } from "@/lib/order-status";
import { PageHeader, Card, Badge, Pagination, Empty, qs } from "@/components/admin/ui";
import { ActionForm, SelectAll, Submit } from "@/components/admin/forms";
import { bulkOrderStatus } from "../../_actions/orders";

export const metadata = { title: "Pedidos" };
const PER = 30;
type SP = { q?: string; status?: string; pagamento?: string; metodo?: string; de?: string; ate?: string; page?: string };

export default async function Orders({ searchParams }: { searchParams: Promise<SP> }) {
  const admin = await requireAdmin("orders.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim().replace(/^#/, "");
  const where: Prisma.OrderWhereInput = {
    AND: [
      q ? { OR: [...(/^\d+$/.test(q) ? [{ number: Number(q) }] : []), { name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { trackingCode: { contains: q, mode: "insensitive" } }, { items: { some: { sku: { contains: q, mode: "insensitive" } } } }] } : {},
      sp.status === "abertos" ? { status: { in: OPEN_FULFILLMENT } } : sp.status ? { status: sp.status as OrderStatus } : {},
      sp.pagamento ? { paymentStatus: sp.pagamento as "PAID" } : {},
      sp.metodo ? { paymentMethod: sp.metodo as "PIX" } : {},
      sp.de ? { createdAt: { gte: new Date(`${sp.de}T00:00:00-03:00`) } } : {},
      sp.ate ? { createdAt: { lt: new Date(new Date(`${sp.ate}T00:00:00-03:00`).getTime() + 86400000) } } : {},
    ],
  };
  const [total, rows, counts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { items: true } } } }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x.status, x._count])) as Record<string, number>;
  const base = { q: sp.q, status: sp.status, pagamento: sp.pagamento, metodo: sp.metodo, de: sp.de, ate: sp.ate };
  const tabs: [string, string, number][] = [["", "Todos", Object.values(c).reduce((a, b) => a + b, 0)], ["AWAITING_PAYMENT", "Aguardando", c.AWAITING_PAYMENT ?? 0], ["abertos", "A enviar", OPEN_FULFILLMENT.reduce((a, s) => a + (c[s] ?? 0), 0)], ["SHIPPED", "Enviados", c.SHIPPED ?? 0], ["DELIVERED", "Entregues", c.DELIVERED ?? 0], ["CANCELED", "Cancelados", c.CANCELED ?? 0]];

  return (
    <>
      <PageHeader title="Pedidos" subtitle={`${total} pedido(s) no filtro`} actions={admin.can("finance.export") && <a className="btn" href={`/api/admin/relatorios/pedidos${qs(base, {})}`}>Exportar CSV</a>} />
      <div className="mb-3 flex flex-wrap gap-1">
        {tabs.map(([k, l, n]) => <Link key={k} href={`/admin/pedidos${qs({}, { status: k })}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${(sp.status ?? "") === k ? "bg-zinc-900 text-[#f3e7cf]" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"}`}>{l} <span className="opacity-60">{n}</span></Link>)}
      </div>
      <Card className="mb-4">
        <form className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          <input type="hidden" name="status" value={sp.status ?? ""} />
          <input name="q" defaultValue={sp.q} placeholder="Nº, cliente, e-mail, rastreio, SKU" className="input lg:col-span-2" />
          <select name="pagamento" defaultValue={sp.pagamento ?? ""} className="input"><option value="">Pagamento: todos</option>{Object.entries(PAYMENT_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select name="metodo" defaultValue={sp.metodo ?? ""} className="input"><option value="">Forma: todas</option><option value="PIX">Pix</option><option value="CREDIT_CARD">Cartão</option></select>
          <input type="date" name="de" defaultValue={sp.de} className="input" aria-label="De" />
          <input type="date" name="ate" defaultValue={sp.ate} className="input" aria-label="Até" />
          <button className="btn">Filtrar</button>
        </form>
      </Card>
      {admin.can("orders.update") && (
        <ActionForm action={bulkOrderStatus} id="bulk-orders" className="mb-3">
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-zinc-500">Selecionados:</span>
            <select name="status" className="input !w-auto" required defaultValue=""><option value="" disabled>Mover para…</option><option value="PICKING">Em separação</option><option value="READY_TO_SHIP">Pronto para envio</option><option value="DELIVERED">Entregue</option></select>
            <Submit className="btn">Aplicar</Submit>
            <a href={`/admin/imprimir/pedidos${qs(base, {})}`} target="_blank" className="btn">Imprimir lista</a>
          </div>
        </ActionForm>
      )}
      <Card pad={false}>
        {rows.length === 0 ? <Empty title="Nenhum pedido encontrado">Os pedidos aparecem aqui assim que os clientes finalizam compras na loja.</Empty> : (
          <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th className="w-8"><SelectAll form="bulk-orders" /></th><th>Pedido</th><th>Data</th><th>Cliente</th><th>Status</th><th>Pagamento</th><th className="text-right">Total</th><th>Entrega</th></tr></thead>
            <tbody>{rows.map((o) => (
              <tr key={o.id}>
                <td><input type="checkbox" name="ids" value={o.id} form="bulk-orders" aria-label={`Selecionar pedido ${o.number}`} /></td>
                <td><Link href={`/admin/pedidos/${o.id}`} className="font-semibold hover:underline">#{o.number}</Link><div className="text-[11px] text-zinc-500">{o._count.items} item(ns)</div></td>
                <td className="whitespace-nowrap text-xs">{formatDate(o.createdAt, true)}</td>
                <td><div className="line-clamp-1">{o.name}</div><div className="text-[11px] text-zinc-500">{o.shipCity}/{o.shipState}</div></td>
                <td><Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge></td>
                <td className="text-xs">{PAYMENT_METHOD_LABEL[o.paymentMethod]}{o.installments > 1 ? ` ${o.installments}x` : ""}<div className="text-[11px] text-zinc-500">{PAYMENT_STATUS_LABEL[o.paymentStatus]}</div></td>
                <td className="text-right tabular-nums font-medium">{formatMoney(o.totalCents)}</td>
                <td className="text-xs">{o.shippingService}{o.trackingCode && <div className="font-mono text-[11px] text-zinc-500">{o.trackingCode}</div>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        <Pagination page={page} pages={Math.ceil(total / PER)} total={total} makeHref={(n) => `/admin/pedidos${qs(base, { page: n })}`} />
      </Card>
    </>
  );
}
