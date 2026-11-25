import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { Container, PageHeading } from "@/components/site/Section";
import { AccountNav } from "@/components/site/AccountNav";

export const metadata = { title: "Minha conta", robots: { index: false } };

export default async function Account() {
  const c = await getCustomer();
  if (!c) redirect("/conta/entrar");
  // pedidos da conta + pedidos feitos como visitante com o mesmo e-mail
  const orders = await prisma.order.findMany({ where: { OR: [{ customerId: c.id }, { email: c.email }] }, orderBy: { createdAt: "desc" }, include: { items: { take: 3 } } });
  return (
    <Container className="max-w-5xl pb-24 pt-10 sm:pt-16">
      <PageHeading eyebrow="Minha conta" title={`Olá, ${c.name.split(" ")[0]}`} text={c.email}><div className="mt-8"><AccountNav current="/conta" /></div></PageHeading>
      <h2 className="eyebrow mb-6 text-ink">Histórico de pedidos</h2>
      {orders.length === 0 ? <p className="text-stone">Você ainda não fez pedidos. <Link href="/" className="underline">Descobrir joias</Link></p> : (
        <ul className="divide-y divide-line border-y border-line">
          {orders.map((o) => (
            <li key={o.id}><Link href={`/pedido/${o.publicToken}`} className="group flex flex-wrap items-center gap-5 py-6">
              <div className="flex gap-1.5">{o.items.map((i) => i.image && <img key={i.id} src={i.image} alt="" className="h-16 w-14 bg-plate object-contain p-1" />)}</div>
              <div className="flex-1"><div className="font-serif text-lg transition-colors group-hover:text-ink/70">Pedido #{o.number}</div><div className="text-xs text-stone">{formatDate(o.createdAt)}{o.trackingCode ? ` · rastreio ${o.trackingCode}` : ""}</div></div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-stone">{ORDER_STATUS_LABEL[o.status]}</div><div className="w-28 text-right text-[14px] tabular-nums">{formatMoney(o.totalCents)}</div>
            </Link></li>
          ))}
        </ul>
      )}
    </Container>
  );
}
