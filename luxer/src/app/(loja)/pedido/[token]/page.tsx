import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL, CUSTOMER_TIMELINE, PAYMENT_METHOD_LABEL } from "@/lib/order-status";
import { syncPayment } from "@/lib/orders";
import { pagarmeConfigured } from "@/lib/payments/pagarme";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { Container } from "@/components/site/Section";
import { PixCopy, AutoRefresh, PurchaseEvent } from "@/components/site/OrderLive";

export const metadata = { title: "Seu pedido", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{16,40}$/.test(token)) notFound();
  let o = await prisma.order.findUnique({ where: { publicToken: token }, include: { items: true, payments: { orderBy: { createdAt: "desc" } }, events: { where: { internal: false }, orderBy: { createdAt: "asc" } } } });
  if (!o) notFound();
  // reforço ao webhook: consulta o gateway enquanto aguarda (no máximo 1x a cada 20s por pedido)
  const pay = o.payments[0];
  if (o.status === "AWAITING_PAYMENT" && pay?.providerOrderId && pagarmeConfigured() && (await rateLimit(`order-sync:${o.id}`, 1, 20))) {
    await syncPayment(pay.id).catch((e) => console.error("[pedido] sync", e));
    o = (await prisma.order.findUnique({ where: { id: o.id }, include: { items: true, payments: { orderBy: { createdAt: "desc" } }, events: { where: { internal: false }, orderBy: { createdAt: "asc" } } } }))!;
  }
  const s = await getSettings();
  const p = o.payments[0];
  const awaitingPix = o.status === "AWAITING_PAYMENT" && o.paymentMethod === "PIX" && p?.pixQrCode;
  const qr = awaitingPix ? await QRCode.toDataURL(p!.pixQrCode!, { margin: 1, width: 320, color: { dark: "#0b0b0c", light: "#ffffff" } }) : null;
  const stepIndex = CUSTOMER_TIMELINE.indexOf(o.status === "READY_TO_SHIP" ? "PICKING" : o.status);
  const canceled = o.status === "CANCELED" || o.status === "REFUNDED";
  const paid = !canceled && o.status !== "AWAITING_PAYMENT";

  return (
    <Container className="max-w-5xl py-12 sm:py-16">
      <AutoRefresh active={o.status === "AWAITING_PAYMENT"} />
      <PurchaseEvent id={String(o.number)} paid={paid} value={o.totalCents / 100} shipping={o.shippingCents / 100} items={o.items.map((i) => ({ item_id: i.sku, item_name: i.name, price: i.unitCents / 100, quantity: i.quantity }))} />
      <div className="text-center">
        <div className="eyebrow text-gold-2">Pedido #{o.number}</div>
        <h1 className="display mt-3 text-4xl sm:text-5xl">{canceled ? ORDER_STATUS_LABEL[o.status] : o.status === "AWAITING_PAYMENT" ? (o.paymentMethod === "PIX" ? "Falta pouco: pague com Pix" : "Pagamento em análise") : `Obrigado, ${o.name.split(" ")[0]}!`}</h1>
        <p className="mt-3 text-sm text-stone">Realizado em {formatDate(o.createdAt, true)} · enviamos os detalhes para {o.email.replace(/^(.{2}).*(@.*)$/, "$1***$2")}</p>
      </div>

      {!canceled && (
        <ol className="mx-auto mt-10 grid max-w-3xl grid-cols-5 text-center text-[10px] uppercase tracking-[0.15em] sm:text-[11px]">
          {CUSTOMER_TIMELINE.map((st, i) => (
            <li key={st} className="relative">
              <div className={`mx-auto h-3 w-3 rounded-full ${i <= stepIndex ? "bg-gold" : "bg-line"}`} />
              {i > 0 && <div className={`absolute right-1/2 top-[5px] h-[2px] w-full -translate-x-[6px] ${i <= stepIndex ? "bg-gold" : "bg-line"}`} />}
              <div className={`mt-3 ${i <= stepIndex ? "text-ink" : "text-stone"}`}>{ORDER_STATUS_LABEL[st]}</div>
            </li>
          ))}
        </ol>
      )}

      {awaitingPix && (
        <section className="mx-auto mt-12 grid max-w-3xl items-center gap-8 bg-sand p-8 sm:grid-cols-[auto_1fr]">
          <img src={qr!} alt="QR Code Pix" className="mx-auto h-56 w-56 bg-white p-2" />
          <div>
            <div className="font-serif text-3xl">{formatMoney(p!.amountCents)}</div>
            <p className="mt-2 text-sm text-stone">Abra o app do seu banco, escolha Pix e escaneie o QR Code ou use o código abaixo.{p!.pixExpiresAt && <> Válido até <b>{formatDate(p!.pixExpiresAt, true)}</b>.</>}</p>
            <div className="mt-4"><PixCopy code={p!.pixQrCode!} /></div>
            <p className="mt-3 text-[11px] text-stone">Esta página se atualiza sozinha quando o pagamento for confirmado.</p>
          </div>
        </section>
      )}
      {o.status === "AWAITING_PAYMENT" && o.paymentMethod === "CREDIT_CARD" && <p className="mx-auto mt-10 max-w-xl text-center text-sm text-stone">A operadora do cartão está analisando o pagamento. Esta página se atualiza automaticamente.</p>}
      {o.trackingCode && <div className="mx-auto mt-10 max-w-xl border border-line p-6 text-center"><div className="eyebrow text-stone">Rastreamento</div><div className="mt-2 font-mono text-lg">{o.trackingCode}</div>{o.trackingUrl && <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn-line mt-4">Acompanhar entrega</a>}</div>}

      <div className="mt-14 grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="display mb-5 text-2xl">Itens</h2>
          <ul className="divide-y divide-line border-y border-line">{o.items.map((i) => <li key={i.id} className="flex gap-4 py-4">{i.image && <img src={i.image} alt="" className="h-20 w-20 bg-sand object-cover mix-blend-multiply" />}<div className="flex-1 text-sm"><div className="font-serif text-lg">{i.name}</div>{i.option && <div className="text-stone">{i.option}</div>}<div className="text-stone">{i.quantity} × {formatMoney(i.unitCents)}</div></div><div className="text-sm">{formatMoney(i.totalCents)}</div></li>)}</ul>
          {paid && <p className="mt-4 text-xs text-stone">Após receber, você pode avaliar as peças na página de cada produto (entre na sua conta).</p>}
        </section>
        <aside className="space-y-6 text-sm">
          <dl className="space-y-2 bg-sand p-6">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(o.subtotalCents)}</dd></div>
            {o.discountCents > 0 && <div className="flex justify-between"><dt>Descontos</dt><dd>− {formatMoney(o.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt>Frete ({o.shippingService})</dt><dd>{o.shippingCents ? formatMoney(o.shippingCents) : "Grátis"}</dd></div>
            {o.interestCents > 0 && <div className="flex justify-between"><dt>Juros</dt><dd>{formatMoney(o.interestCents)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-3 text-base"><dt>Total</dt><dd className="font-serif text-xl">{formatMoney(o.totalCents)}</dd></div>
            <div className="pt-2 text-xs text-stone">{PAYMENT_METHOD_LABEL[o.paymentMethod]}{o.installments > 1 ? ` em ${o.installments}x` : ""}{p?.cardLast4 ? ` · final ${p.cardLast4}` : ""}</div>
          </dl>
          {o.events.length > 0 && <div><div className="eyebrow mb-3 text-stone">Histórico</div><ul className="space-y-2">{o.events.map((e) => <li key={e.id}><span className="text-stone">{formatDate(e.createdAt, true)}</span> — {e.message}</li>)}</ul></div>}
          <div className="text-xs text-stone">Dúvidas? <a className="underline" href={`https://wa.me/${s.contact.whatsapp}?text=${encodeURIComponent(`Olá! Sobre o meu pedido #${o.number}.`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a> · {s.contact.email}</div>
          <Link href="/" className="btn-line w-full">Continuar navegando</Link>
        </aside>
      </div>
    </Container>
  );
}
