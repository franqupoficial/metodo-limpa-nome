import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaymentProvider, scrubPaymentPayload } from "@/lib/payments";

/**
 * Webhook do fornecedor de pagamentos (checkout futuro).
 * Retorna 501 enquanto nenhum fornecedor estiver configurado.
 */
export async function POST(req: Request) {
  const provider = getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "Checkout não habilitado." }, { status: 501 });
  const raw = await req.text();
  const event = await provider.parseWebhook(raw, req.headers);
  if (!event) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  const payment = await prisma.payment.findUnique({ where: { provider_providerChargeId: { provider: provider.name, providerChargeId: event.providerChargeId } } });
  if (!payment) return NextResponse.json({ ok: true });
  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { status: event.status, paidAt: event.paidAt ?? payment.paidAt } }),
    prisma.paymentEvent.create({ data: { paymentId: payment.id, type: event.type, payload: scrubPaymentPayload(event.raw) as object } }),
  ]);
  return NextResponse.json({ ok: true });
}
