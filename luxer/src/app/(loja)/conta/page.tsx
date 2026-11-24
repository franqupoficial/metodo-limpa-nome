import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { Container } from "@/components/site/Section";
import { AccountNav } from "@/components/site/AccountNav";

export const metadata = { title: "Minha conta", robots: { index: false } };

export default async function Account() {
  const c = await getCustomer();
  if (!c) redirect("/conta/entrar");
  // pedidos da conta + pedidos feitos como visitante com o mesmo e-mail
  const orders = await prisma.order.findMany({ where: { OR: [{ customerId: c.id }, { email: c.email }] }, orderBy: { createdAt: "desc" }, include: { items: { take: 3 } } });
  return (
    <Container className="max-w-5xl py-14">
      <h1 className="display text-5xl">Olá, {c.name.split(" ")[0]}</h1>
      <p className="mt-2 text-sm text-stone">{c.email}</p>
      <div className="mt-8"><AccountNav current="/conta" /></div>
      <h2 className="display mb-6 text-3xl">Histórico de pedidos</h2>
      {orders.length === 0 ? <p className="text-stone">Você ainda não fez pedidos. <Link href="/" className="underline">Descobrir joias</Link></p> : (
        <ul className="divide-y divide-line border-y border-line">
          {orders.map((o) => (
            <li key={o.id}><Link href={`/pedido/${o.publicToken}`} className="flex flex-wrap items-center gap-4 py-5 hover:bg-sand/60">
              <div className="flex -space-x-3">{o.items.map((i) => i.image && <img key={i.id} src={i.image} alt="" className="h-14 w-14 border-2 border-ivory bg-sand object-cover" />)}</div>
              <div className="flex-1"><div className="font-medium">Pedido #{o.number}</div><div className="text-xs text-stone">{formatDate(o.createdAt)}{o.trackingCode ? ` · rastreio ${o.trackingCode}` : ""}</div></div>
              <div className="text-sm">{ORDER_STATUS_LABEL[o.status]}</div><div className="w-28 text-right font-serif text-lg">{formatMoney(o.totalCents)}</div>
            </Link></li>
          ))}
        </ul>
      )}
    </Container>
  );
}
