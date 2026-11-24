import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptJson, decryptString } from "@/lib/crypto";
import { formatDate, formatMoney, formatPhone, formatCep } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_STATUS_LABEL, PAYMENT_METHOD_LABEL, allowedTransitions, REVENUE_STATUSES } from "@/lib/order-status";
import { PageHeader, Card, Badge, Field, Alert } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { updateOrderStatus, addOrderNote, cancelOrderAction, syncPaymentAction, buyLabelAction, printLabelAction, refreshTrackingAction } from "../../../_actions/orders";
import { melhorEnvioConfigured } from "@/lib/shipping";
import { audit } from "@/lib/audit";

export const metadata = { title: "Pedido" };
type Addr = { recipient: string; postalCode: string; street: string; number: string; complement?: string; district: string; city: string; state: string };

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cpf?: string }> }) {
  const admin = await requireAdmin("orders.view");
  const { id } = await params;
  const { cpf: showCpf } = await searchParams;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { id: true } } } }, events: { orderBy: { createdAt: "desc" } }, payments: { orderBy: { createdAt: "desc" } }, customer: { select: { id: true, ordersCount: true } } } });
  if (!o) notFound();
  const addr = o.addressEnc ? decryptJson<Addr>(o.addressEnc) : null;
  let cpf: string | null = null;
  if (o.cpfEnc) {
    const full = decryptString(o.cpfEnc);
    if (showCpf && admin.can("customers.pii")) {
      cpf = full.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      await audit(admin.id, "pii.view_cpf", "Order", o.id);
    } else cpf = `***.***.***-${full.slice(-2)}`;
  }
  const next = allowedTransitions(o.status).filter((s) => s !== "CANCELED");
  const paid = REVENUE_STATUSES.includes(o.status);
  const canCancel = admin.can("orders.cancel") && !["CANCELED", "REFUNDED", "SHIPPED", "DELIVERED"].includes(o.status);

  return (
    <>
      <PageHeader title={`Pedido #${o.number}`} back={{ href: "/admin/pedidos", label: "Pedidos" }}
        subtitle={<>{formatDate(o.createdAt, true)} · <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge> · {PAYMENT_STATUS_LABEL[o.paymentStatus]}</>}
        actions={<><a href={`/admin/imprimir/pedido/${o.id}`} target="_blank" className="btn">Imprimir pedido</a><a href={`/pedido/${o.publicToken}`} target="_blank" className="btn">Página do cliente</a></>} />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title="Itens" pad={false}>
            <table className="tbl"><tbody>
              {o.items.map((i) => (
                <tr key={i.id}>
                  <td className="w-14">{i.image && <img src={i.image} alt="" className="h-12 w-12 rounded object-cover" />}</td>
                  <td>{i.product ? <Link className="font-medium hover:underline" href={`/admin/produtos/${i.product.id}`}>{i.name}</Link> : i.name}<div className="text-[11px] text-zinc-500"><span className="font-mono">{i.sku}</span>{i.option ? ` · ${i.option}` : ""}</div></td>
                  <td className="text-right tabular-nums">{i.quantity} × {formatMoney(i.unitCents)}</td>
                  <td className="text-right tabular-nums font-medium">{formatMoney(i.totalCents)}</td>
                </tr>
              ))}
            </tbody></table>
            <dl className="space-y-1 border-t border-zinc-100 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-zinc-500">Subtotal (preço de tabela)</dt><dd className="tabular-nums">{formatMoney(o.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Descontos{o.couponCode ? ` (cupom ${o.couponCode}${o.paymentMethod === "PIX" ? " + Pix" : ""})` : o.paymentMethod === "PIX" ? " (Pix)" : ""}</dt><dd className="tabular-nums">− {formatMoney(o.discountCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Frete · {o.shippingService}</dt><dd className="tabular-nums">{formatMoney(o.shippingCents)}</dd></div>
              {o.interestCents > 0 && <div className="flex justify-between"><dt className="text-zinc-500">Juros do parcelamento</dt><dd className="tabular-nums">{formatMoney(o.interestCents)}</dd></div>}
              <div className="flex justify-between border-t border-zinc-100 pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(o.totalCents)}</dd></div>
            </dl>
          </Card>

          {admin.can("orders.update") && next.length > 0 && (
            <Card title="Atualizar andamento">
              <ActionForm action={updateOrderStatus} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={o.id} />
                <Field label="Novo status"><select name="status" className="input" required>{next.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select></Field>
                <Field label="Código de rastreamento" hint="Obrigatório para “Enviado”."><input name="trackingCode" defaultValue={o.trackingCode ?? ""} className="input font-mono" /></Field>
                <Field label="Transportadora"><input name="carrier" defaultValue={o.shippingCarrier ?? ""} className="input" /></Field>
                <Field label="Link de rastreamento" hint="Opcional. Correios é preenchido automaticamente."><input name="trackingUrl" defaultValue={o.trackingUrl ?? ""} className="input" /></Field>
                <Field label="Mensagem no histórico (visível ao cliente)" className="sm:col-span-2"><input name="note" className="input" /></Field>
                <div><Submit>Atualizar pedido</Submit></div>
              </ActionForm>
            </Card>
          )}

          <Card title="Histórico, notas e ocorrências">
            {admin.can("orders.update") && (
              <ActionForm action={addOrderNote} className="mb-4 flex flex-wrap gap-2" resetOnSuccess>
                <input type="hidden" name="id" value={o.id} />
                <select name="type" className="input !w-auto"><option value="note">Nota interna</option><option value="occurrence">Ocorrência</option></select>
                <input name="message" placeholder="Ex.: cliente pediu embalagem para presente" required className="input min-w-0 flex-1" />
                <Submit>Registrar</Submit>
              </ActionForm>
            )}
            <ol className="space-y-3 border-l border-zinc-200 pl-4">
              {o.events.map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${e.type === "occurrence" ? "bg-red-500" : e.type === "note" ? "bg-amber-400" : e.type === "payment" ? "bg-emerald-500" : "bg-zinc-400"}`} />
                  <div className="text-sm text-zinc-800">{e.message}</div>
                  <div className="text-[11px] text-zinc-500">{formatDate(e.createdAt, true)} · {e.adminName ?? "sistema"} · {e.type === "note" ? "nota interna" : e.type === "occurrence" ? "ocorrência" : e.internal ? "interno" : "visível ao cliente"}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Cliente">
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{o.name}</div>
              <div>{o.email}</div>
              {o.phone && <div>{formatPhone(o.phone)} · <a className="text-emerald-700 underline" target="_blank" rel="noreferrer" href={`https://wa.me/55${o.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, ${o.name.split(" ")[0]}! Aqui é da Luxer Joias, sobre o pedido #${o.number}.`)}`}>WhatsApp</a></div>}
              {cpf && <div>CPF: <span className="font-mono">{cpf}</span> {!showCpf && admin.can("customers.pii") && <Link className="text-xs underline" href={`?cpf=1`}>revelar (auditado)</Link>}</div>}
              {o.customer && <Link className="text-xs underline" href={`/admin/clientes/${o.customer.id}`}>Ver cadastro · {o.customer.ordersCount} pedido(s) pago(s)</Link>}
              {o.customerNote && <Alert>Observação do cliente: {o.customerNote}</Alert>}
            </div>
          </Card>
          <Card title="Entrega">
            {addr ? <address className="text-sm not-italic leading-relaxed">{addr.recipient}<br />{addr.street}, {addr.number}{addr.complement ? ` — ${addr.complement}` : ""}<br />{addr.district} · {addr.city}/{addr.state}<br />CEP {formatCep(addr.postalCode)}</address> : "—"}
            <div className="mt-3 text-sm"><b>{o.shippingService}</b> {o.shippingCarrier && `· ${o.shippingCarrier}`} {o.shippingDays ? `· prazo ${o.shippingDays} dias úteis` : ""}</div>
            {o.trackingCode && <div className="mt-1 text-sm">Rastreio: {o.trackingUrl ? <a className="font-mono underline" target="_blank" rel="noreferrer" href={o.trackingUrl}>{o.trackingCode}</a> : <span className="font-mono">{o.trackingCode}</span>}</div>}
            {admin.can("orders.update") && melhorEnvioConfigured() && o.shippingServiceId?.startsWith("me:") && (
              <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                {!o.shippingLabelId && paid && (
                  <ActionForm action={buyLabelAction} className="space-y-2">
                    <input type="hidden" name="id" value={o.id} />
                    <input name="invoiceKey" placeholder="Chave da NF-e (44 dígitos)" className="input font-mono text-xs" />
                    <Submit className="btn" confirm="Comprar a etiqueta no Melhor Envio? O valor é debitado da carteira Melhor Envio.">Gerar etiqueta</Submit>
                  </ActionForm>
                )}
                {o.shippingLabelId && <div className="flex flex-wrap gap-2"><ActionButton action={printLabelAction} fields={{ id: o.id }} label="Imprimir etiqueta" /><ActionButton action={refreshTrackingAction} fields={{ id: o.id }} label="Atualizar rastreio" /></div>}
              </div>
            )}
          </Card>
          <Card title="Pagamento">
            {o.payments.map((p) => (
              <div key={p.id} className="space-y-1 text-sm">
                <div className="flex justify-between"><span>{PAYMENT_METHOD_LABEL[p.method]}{p.installments > 1 ? ` em ${p.installments}x` : ""}</span><Badge tone={p.status === "PAID" ? "green" : p.status === "FAILED" ? "red" : "amber"}>{PAYMENT_STATUS_LABEL[p.status]}</Badge></div>
                <div className="flex justify-between text-zinc-600"><span>Valor</span><span className="tabular-nums">{formatMoney(p.amountCents)}</span></div>
                {p.feeCents != null && <div className="flex justify-between text-zinc-600"><span>Taxa do gateway</span><span className="tabular-nums">{formatMoney(p.feeCents)}</span></div>}
                {p.refundedCents > 0 && <div className="flex justify-between text-zinc-600"><span>Reembolsado</span><span className="tabular-nums">{formatMoney(p.refundedCents)}</span></div>}
                {p.cardBrand && <div className="text-zinc-600">{p.cardBrand} final {p.cardLast4}</div>}
                {p.paidAt && <div className="text-zinc-600">Pago em {formatDate(p.paidAt, true)}</div>}
                {p.failureReason && <div className="text-red-700">{p.failureReason}</div>}
                <div className="text-[11px] text-zinc-400">{p.provider} · {p.providerOrderId ?? "sem ID no gateway"}</div>
                {p.providerOrderId && <ActionButton action={syncPaymentAction} fields={{ paymentId: p.id }} label="Sincronizar com a Pagar.me" className="btn !py-1 text-xs" />}
              </div>
            ))}
          </Card>
          {canCancel && (
            <Card title="Cancelar pedido">
              <ActionForm action={cancelOrderAction} className="space-y-2">
                <input type="hidden" name="id" value={o.id} />
                <input name="reason" placeholder="Motivo" required className="input" />
                {paid && <>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="refund" defaultChecked disabled={!admin.can("orders.refund")} /> Reembolsar o cliente na Pagar.me</label>
                  {!admin.can("orders.refund") && <p className="text-xs text-amber-700">Pedido pago: o cancelamento exige permissão de reembolso.</p>}
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="restock" defaultChecked /> Devolver itens ao estoque</label>
                </>}
                <Submit className="btn btn-danger" confirm={paid ? "Cancelar e reembolsar este pedido? Esta ação não pode ser desfeita." : "Cancelar este pedido?"}>Cancelar pedido</Submit>
              </ActionForm>
            </Card>
          )}
          <Card title="Documentos fiscais"><p className="text-sm text-zinc-600">Emissão de NF-e não integrada. Emita a nota no sistema fiscal da loja e informe a chave ao gerar a etiqueta. Configure o provedor fiscal em Configurações → Fiscal quando contratado.</p></Card>
        </div>
      </div>
    </>
  );
}
