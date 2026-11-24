import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, formatDate } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { PageHeader, Card, Empty } from "@/components/admin/ui";

export const metadata = { title: "Busca" };

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const num = Number(q.replace(/^#/, ""));
  const ci = { contains: q, mode: "insensitive" as const };
  const [orders, products, customers, coupons] = q.length < 2 ? [[], [], [], []] : await Promise.all([
    admin.can("orders.view") ? prisma.order.findMany({ where: { OR: [...(Number.isInteger(num) && num > 0 ? [{ number: num }] : []), { email: ci }, { name: ci }, { trackingCode: ci }] }, orderBy: { createdAt: "desc" }, take: 10 }) : [],
    admin.can("products.view") ? prisma.product.findMany({ where: { OR: [{ name: ci }, { ref: ci }, { sku: ci }, { variants: { some: { sku: ci } } }] }, take: 10, select: { id: true, name: true, ref: true, status: true, priceCents: true } }) : [],
    admin.can("customers.view") ? prisma.customer.findMany({ where: { anonymizedAt: null, OR: [{ name: ci }, { email: ci }, { phone: { contains: q.replace(/\D/g, "") || q } }] }, take: 10 }) : [],
    admin.can("marketing.manage") ? prisma.coupon.findMany({ where: { code: ci }, take: 5 }) : [],
  ]);
  const none = !orders.length && !products.length && !customers.length && !coupons.length;
  return (
    <>
      <PageHeader title={`Resultados para “${q}”`} />
      {q.length < 2 || none ? <Card><Empty title={q.length < 2 ? "Digite ao menos 2 caracteres." : "Nada encontrado."} /></Card> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {orders.length > 0 && <Card title="Pedidos" pad={false}><table className="tbl"><tbody>{orders.map((o) => <tr key={o.id}><td><Link className="font-semibold hover:underline" href={`/admin/pedidos/${o.id}`}>#{o.number}</Link></td><td>{o.name}</td><td>{ORDER_STATUS_LABEL[o.status]}</td><td className="text-right">{formatMoney(o.totalCents)}</td><td className="text-xs text-zinc-500">{formatDate(o.createdAt)}</td></tr>)}</tbody></table></Card>}
          {products.length > 0 && <Card title="Produtos" pad={false}><table className="tbl"><tbody>{products.map((p) => <tr key={p.id}><td><Link className="hover:underline" href={`/admin/produtos/${p.id}`}>{p.name}</Link></td><td className="text-xs text-zinc-500">{p.ref}</td><td className="text-right">{formatMoney(p.priceCents)}</td></tr>)}</tbody></table></Card>}
          {customers.length > 0 && <Card title="Clientes" pad={false}><table className="tbl"><tbody>{customers.map((c) => <tr key={c.id}><td><Link className="hover:underline" href={`/admin/clientes/${c.id}`}>{c.name}</Link></td><td className="text-xs text-zinc-500">{c.email}</td><td className="text-right">{c.ordersCount} pedido(s)</td></tr>)}</tbody></table></Card>}
          {coupons.length > 0 && <Card title="Cupons" pad={false}><table className="tbl"><tbody>{coupons.map((c) => <tr key={c.id}><td><Link className="font-mono hover:underline" href={`/admin/marketing/cupons?editar=${c.id}`}>{c.code}</Link></td><td>{c.active ? "Ativo" : "Inativo"}</td><td className="text-right">{c.usedCount} uso(s)</td></tr>)}</tbody></table></Card>}
        </div>
      )}
    </>
  );
}
