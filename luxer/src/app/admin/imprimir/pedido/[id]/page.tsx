import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptJson } from "@/lib/crypto";
import { formatDate, formatMoney, formatCep, formatPhone } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { PAYMENT_METHOD_LABEL } from "@/lib/order-status";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Imprimir pedido", robots: { index: false } };
type Addr = { recipient: string; postalCode: string; street: string; number: string; complement?: string; district: string; city: string; state: string };

export default async function PrintOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders.view");
  const { id } = await params;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!o) notFound();
  const s = await getSettings();
  const a = o.addressEnc ? decryptJson<Addr>(o.addressEnc) : null;
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm text-black">
      <div className="mb-6 flex items-start justify-between border-b pb-4">
        <div><div className="font-serif text-3xl tracking-[0.3em]">LUXER</div><div className="text-xs">{s.store.legalName} · CNPJ {s.store.cnpj}</div></div>
        <div className="text-right"><div className="text-xl font-semibold">Pedido #{o.number}</div><div>{formatDate(o.createdAt, true)}</div><PrintButton /></div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-6">
        <div><div className="mb-1 text-xs font-semibold uppercase">Destinatário</div>{a && <>{a.recipient}<br />{a.street}, {a.number}{a.complement ? ` — ${a.complement}` : ""}<br />{a.district} · {a.city}/{a.state}<br />CEP {formatCep(a.postalCode)}</>}<br />{o.phone && formatPhone(o.phone)}</div>
        <div><div className="mb-1 text-xs font-semibold uppercase">Envio e pagamento</div>{o.shippingService}<br />{o.trackingCode && <>Rastreio: {o.trackingCode}<br /></>}{PAYMENT_METHOD_LABEL[o.paymentMethod]}{o.installments > 1 ? ` ${o.installments}x` : ""}</div>
      </div>
      <table className="w-full border-collapse"><thead><tr className="border-b text-left text-xs uppercase"><th className="py-2">✓</th><th>Item</th><th>SKU</th><th className="text-right">Qtd.</th><th className="text-right">Valor</th></tr></thead>
        <tbody>{o.items.map((i) => <tr key={i.id} className="border-b"><td className="py-2">☐</td><td>{i.name}{i.option ? ` — ${i.option}` : ""}</td><td className="font-mono text-xs">{i.sku}</td><td className="text-right">{i.quantity}</td><td className="text-right">{formatMoney(i.totalCents)}</td></tr>)}</tbody></table>
      <div className="mt-4 text-right">Frete: {formatMoney(o.shippingCents)} · Descontos: {formatMoney(o.discountCents)}<br /><b>Total: {formatMoney(o.totalCents)}</b></div>
      {o.customerNote && <p className="mt-4 border p-2">Observação do cliente: {o.customerNote}</p>}
      <p className="mt-10 text-xs">Separado por: ____________________ Conferido por: ____________________</p>
    </div>
  );
}
