import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Mensagens de uma conversa para o painel (polling). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin?.can("support.chat")) return new Response("Acesso negado", { status: 403 });
  const { id } = await params;
  const after = new URL(req.url).searchParams.get("after");
  const c = await prisma.chatConversation.findUnique({ where: { id } });
  if (!c) return new Response("Not found", { status: 404 });
  const messages = await prisma.chatMessage.findMany({ where: { conversationId: id, ...(after ? { createdAt: { gt: new Date(after) } } : {}) }, orderBy: { createdAt: "asc" } });
  if (c.unreadAdmin) await prisma.chatConversation.update({ where: { id }, data: { unreadAdmin: 0 } });
  return Response.json({ status: c.status, messages: messages.map((m) => ({ id: m.id, role: m.role, body: m.body, adminName: m.adminName, at: m.createdAt.toISOString(), products: (m.meta as { products?: { name: string; slug: string }[] } | null)?.products ?? [] })) }, { headers: { "Cache-Control": "no-store" } });
}
