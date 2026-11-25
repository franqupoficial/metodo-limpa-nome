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
    <Container className="max-w-5xl pb-24 pt-12 sm:pt-20">
      <AutoRefresh active={o.status === "AWAITING_PAYMENT"} />
      <PurchaseEvent id={String(o.number)} paid={paid} value={o.totalCents / 100} shipping={o.shippingCents / 100} items={o.items.map((i) => ({ item_id: i.sku, item_name: i.name, price: i.unitCents / 100, quantity: i.quantity }))} />
      <div className="text-center">
        <div className="eyebrow text-stone">Pedido #{o.number}</div>
        <h1 className="display mt-4 text-[2.4rem] sm:text-[3.4rem]">{canceled ? ORDER_STATUS_LABEL[o.status] : o.status === "AWAITING_PAYMENT" ? (o.paymentMethod === "PIX" ? "Falta pouco: pague com Pix" : "Pagamento em análise") : `Obrigado, ${o.name.split(" ")[0]}!`}</h1>
        <p className="mt-4 text-[13px] text-stone">Realizado em {formatDate(o.createdAt, true)} · enviamos os detalhes para {o.email.replace(/^(.{2}).*(@.*)$/, "$1***$2")}</p>
      </div>

      {!canceled && (
        <ol className="mx-auto mt-14 grid max-w-3xl grid-cols-5 text-center text-[9px] uppercase tracking-[0.16em] sm:text-[10px]">
          {CUSTOMER_TIMELINE.map((st, i) => (
            <li key={st} className="relative">
              <div className={`relative z-10 mx-auto h-2 w-2 rounded-full ${i <= stepIndex ? "bg-ink" : "border border-stone/50 bg-ivory"}`} />
              {i > 0 && <div className={`absolute right-1/2 top-[3.5px] h-px w-full ${i <= stepIndex ? "bg-ink" : "bg-line"}`} />}
              <div className={`mt-3 ${i <= stepIndex ? "text-ink" : "text-stone"}`}>{ORDER_STATUS_LABEL[st]}</div>
            </li>
          ))}
        </ol>
      )}

      {awaitingPix && (
        <section className="mx-auto mt-14 grid max-w-3xl items-center gap-10 border-y border-line py-10 sm:grid-cols-[auto_1fr]">
          <img src={qr!} alt="QR Code Pix" className="mx-auto h-56 w-56 bg-plate p-3" />
          <div>
            <div className="text-[1.9rem] font-light tabular-nums">{formatMoney(p!.amountCents)}</div>
            <p className="mt-2 text-sm text-stone">Abra o app do seu banco, escolha Pix e escaneie o QR Code ou use o código abaixo.{p!.pixExpiresAt && <> Válido até <b>{formatDate(p!.pixExpiresAt, true)}</b>.</>}</p>
            <div className="mt-4"><PixCopy code={p!.pixQrCode!} /></div>
            <p className="mt-3 text-[11px] text-stone">Esta página se atualiza sozinha quando o pagamento for confirmado.</p>
          </div>
        </section>
      )}
      {o.status === "AWAITING_PAYMENT" && o.paymentMethod === "CREDIT_CARD" && <p className="mx-auto mt-10 max-w-xl text-center text-sm text-stone">A operadora do cartão está analisando o pagamento. Esta página se atualiza automaticamente.</p>}
      {o.trackingCode && <div className="mx-auto mt-12 max-w-xl border-y border-line py-8 text-center"><div className="eyebrow text-stone">Rastreamento</div><div className="mt-2 font-mono text-lg">{o.trackingCode}</div>{o.trackingUrl && <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn-line mt-4">Acompanhar entrega</a>}</div>}

      <div className="mt-20 grid gap-14 md:grid-cols-[1.4fr_1fr] md:gap-20">
        <section>
          <h2 className="eyebrow mb-5 text-ink">Itens</h2>
          <ul className="divide-y divide-line border-y border-line">{o.items.map((i) => <li key={i.id} className="flex gap-5 py-5">{i.image && <img src={i.image} alt="" className="h-24 w-20 bg-plate object-contain p-1.5" />}<div className="flex-1 text-[13px]"><div className="font-serif text-lg">{i.name}</div>{i.option && <div className="text-stone">{i.option}</div>}<div className="text-stone">{i.quantity} × {formatMoney(i.unitCents)}</div></div><div className="text-[13px] tabular-nums">{formatMoney(i.totalCents)}</div></li>)}</ul>
          {paid && <p className="mt-4 text-xs text-stone">Após receber, você pode avaliar as peças na página de cada produto (entre na sua conta).</p>}
        </section>
        <aside className="space-y-8 text-[13px]">
          <dl className="space-y-2.5 border-t border-ink pt-6 tabular-nums">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(o.subtotalCents)}</dd></div>
            {o.discountCents > 0 && <div className="flex justify-between"><dt>Descontos</dt><dd>− {formatMoney(o.discountCents)}</dd></div>}
            <div className="flex justify-between"><dt>Frete ({o.shippingService})</dt><dd>{o.shippingCents ? formatMoney(o.shippingCents) : "Grátis"}</dd></div>
            {o.interestCents > 0 && <div className="flex justify-between"><dt>Juros</dt><dd>{formatMoney(o.interestCents)}</dd></div>}
            <div className="flex items-baseline justify-between border-t border-line pt-4"><dt className="eyebrow">Total</dt><dd className="text-xl font-light">{formatMoney(o.totalCents)}</dd></div>
            <div className="pt-2 text-xs text-stone">{PAYMENT_METHOD_LABEL[o.paymentMethod]}{o.installments > 1 ? ` em ${o.installments}x` : ""}{p?.cardLast4 ? ` · final ${p.cardLast4}` : ""}</div>
          </dl>
          {o.events.length > 0 && <div><div className="eyebrow mb-3 text-stone">Histórico</div><ul className="space-y-2">{o.events.map((e) => <li key={e.id}><span className="text-stone">{formatDate(e.createdAt, true)}</span> — {e.message}</li>)}</ul></div>}
          <div className="text-xs text-stone">Dúvidas? <a className="underline underline-offset-4" href={`https://wa.me/${s.contact.whatsapp}?text=${encodeURIComponent(`Olá! Sobre o meu pedido #${o.number}.`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a> · {s.contact.email}</div>
          <Link href="/" className="btn-line w-full">Continuar navegando</Link>
        </aside>
      </div>
    </Container>
  );
}
