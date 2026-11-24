import { z } from "zod";
import { prisma } from "@/lib/db";
import { guardPublic } from "@/lib/http";
import { getSettings } from "@/lib/settings";
import { getCustomer } from "@/lib/customer-auth";
import { aiReply, aiSupportConfigured } from "@/lib/ai/support";
import { getConversation, publicMessage, requestHuman } from "@/lib/chat";
import { notify } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";

/** Histórico/novas mensagens da conversa do visitante (cookie). */
export async function GET(req: Request) {
  const c = await getConversation(false);
  const s = await getSettings();
  const after = new URL(req.url).searchParams.get("after");
  if (!c) return Response.json({ status: null, messages: [], greeting: s.concierge.greeting });
  const messages = await prisma.chatMessage.findMany({ where: { conversationId: c.id, ...(after ? { createdAt: { gt: new Date(after) } } : {}) }, orderBy: { createdAt: "asc" }, take: 100 });
  if (c.unreadCustomer) await prisma.chatConversation.update({ where: { id: c.id }, data: { unreadCustomer: 0 } });
  return Response.json({ status: c.status, needsContact: !c.email && !c.phone, messages: messages.map(publicMessage) }, { headers: { "Cache-Control": "no-store" } });
}

const schema = z.object({
  message: z.string().trim().min(1).max(1500).optional(),
  human: z.boolean().optional(),
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  page: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const blocked = await guardPublic(req, "chat", 30, 600);
  if (blocked) return blocked;
  const s = await getSettings();
  if (!s.concierge.enabled) return Response.json({ ok: false, error: "Atendimento indisponível." }, { status: 503 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ ok: false, error: "Mensagem inválida." }, { status: 400 });
  const d = p.data;
  let c = (await getConversation(true))!;
  const customer = await getCustomer();
  const contact = { ...(d.name ? { name: d.name } : {}), ...(d.email ? { email: d.email } : {}), ...(d.phone ? { phone: d.phone.replace(/\D/g, "") } : {}) };
  c = await prisma.chatConversation.update({
    where: { id: c.id },
    data: { ...contact, customerId: c.customerId ?? customer?.id, name: contact.name ?? c.name ?? customer?.name, email: contact.email ?? c.email ?? customer?.email, page: d.page ?? c.page, lastMessageAt: new Date() },
  });
  if (d.message) {
    await prisma.chatMessage.create({ data: { conversationId: c.id, role: "USER", body: d.message } });
    if (c.status !== "AI") {
      await prisma.chatConversation.update({ where: { id: c.id }, data: { unreadAdmin: { increment: 1 } } });
      if (await rateLimit(`chat-notify:${c.id}`, 1, 600)) await notify("system", "Nova mensagem no chat", `${c.name ?? "Visitante"}: ${d.message.slice(0, 100)}`, `/admin/atendimento?c=${c.id}`);
    }
  }
  if (d.human && c.status === "AI") {
    await requestHuman(c.id, "Cliente pediu atendimento humano");
  } else if (d.message && c.status === "AI") {
    const aiOn = s.concierge.aiEnabled && aiSupportConfigured();
    if (!aiOn || c.aiTurns >= 30 || !(await rateLimit(`chat-ai:${c.id}`, 12, 600))) {
      await requestHuman(c.id, aiOn ? "Limite de mensagens da IA" : "IA desativada");
    } else {
      const r = await aiReply(c.id);
      await prisma.chatMessage.create({ data: { conversationId: c.id, role: "AI", body: r.text, meta: r.products.length ? { products: r.products } : undefined } });
      await prisma.chatConversation.update({ where: { id: c.id }, data: { aiTurns: { increment: 1 } } });
      if (r.handoff) await requestHuman(c.id, r.handoff);
    }
  }
  const fresh = await prisma.chatConversation.findUniqueOrThrow({ where: { id: c.id } });
  return Response.json({ ok: true, status: fresh.status, needsContact: !fresh.email && !fresh.phone });
}
