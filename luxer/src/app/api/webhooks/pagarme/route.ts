import { prisma } from "@/lib/db";
import * as pagarme from "@/lib/payments/pagarme";
import { applyPaymentUpdate } from "@/lib/orders";

/**
 * Webhook da Pagar.me. Segurança em camadas:
 * 1) Basic Auth configurada no painel Pagar.me (PAGARME_WEBHOOK_USER/PASSWORD);
 * 2) idempotência por ID do evento;
 * 3) o payload NUNCA é confiado: o estado é sempre reconsultado na API da Pagar.me antes de aplicar.
 */
export async function POST(req: Request) {
  if (!pagarme.verifyWebhookAuth(req.headers.get("authorization"))) return new Response("Unauthorized", { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: string; type?: string; data?: { id?: string; order?: { id?: string }; code?: string } } | null;
  if (!body?.id || !body.type) return new Response("Bad request", { status: 400 });
  const existing = await prisma.webhookEvent.findUnique({ where: { provider_eventId: { provider: "pagarme", eventId: body.id } } });
  if (existing?.processedAt) return Response.json({ ok: true, duplicate: true });
  const ev = existing ?? (await prisma.webhookEvent.create({ data: { provider: "pagarme", eventId: body.id, type: body.type, payload: body as object } }));
  try {
    const orderId = body.type.startsWith("order.") ? body.data?.id : body.data?.order?.id;
    const chargeId = body.type.startsWith("charge.") ? body.data?.id : undefined;
    const payment = await prisma.payment.findFirst({ where: { OR: [...(orderId ? [{ providerOrderId: orderId }] : []), ...(chargeId ? [{ providerChargeId: chargeId }] : [])] } });
    if (payment?.providerOrderId) {
      const fresh = await pagarme.getOrder(payment.providerOrderId);
      const charge = fresh.charges?.find((c) => c.id === (payment.providerChargeId ?? chargeId)) ?? fresh.charges?.[0] ?? null;
      await applyPaymentUpdate(payment.id, charge, fresh.status);
    }
    await prisma.webhookEvent.update({ where: { id: ev.id }, data: { processedAt: new Date(), error: payment ? null : "pagamento não encontrado" } });
    return Response.json({ ok: true });
  } catch (e) {
    await prisma.webhookEvent.update({ where: { id: ev.id }, data: { error: e instanceof Error ? e.message.slice(0, 500) : "erro" } });
    console.error("[webhook pagarme]", e);
    return new Response("Erro ao processar", { status: 500 }); // a Pagar.me reenviará
  }
}
