import "server-only";
import { cookies } from "next/headers";
import type { ChatConversation } from "@prisma/client";
import { prisma } from "./db";
import { randomToken, sha256 } from "./crypto";
import { notify } from "./notifications";
import { rateLimit } from "./rate-limit";

export const CHAT_COOKIE = "lx_chat";

export async function getConversation(create: boolean): Promise<ChatConversation | null> {
  const jar = await cookies();
  const t = jar.get(CHAT_COOKIE)?.value;
  if (t) {
    const c = await prisma.chatConversation.findUnique({ where: { tokenHash: sha256(t) } });
    if (c && c.status !== "CLOSED") return c;
    if (c && !create) return c;
  }
  if (!create) return null;
  const token = randomToken(24);
  jar.set(CHAT_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return prisma.chatConversation.create({ data: { tokenHash: sha256(token) } });
}

export const publicMessage = (m: { id: string; role: string; body: string; adminName: string | null; meta: unknown; createdAt: Date }) => ({
  id: m.id, role: m.role, body: m.body, agent: m.role === "AGENT" ? m.adminName?.split(" ")[0] ?? "Equipe Luxer" : null, products: (m.meta as { products?: unknown[] } | null)?.products ?? [], at: m.createdAt.toISOString(),
});

/** Coloca a conversa na fila humana e avisa a equipe (no máximo 1 notificação a cada 10 min por conversa). */
export async function requestHuman(conversationId: string, reason: string) {
  const c = await prisma.chatConversation.update({ where: { id: conversationId }, data: { status: "WAITING_HUMAN", handoffReason: reason.slice(0, 200), unreadAdmin: { increment: 1 } } });
  await prisma.chatMessage.create({ data: { conversationId, role: "SYSTEM", body: "Conversa transferida para a equipe Luxer. Um atendente responderá por aqui." } });
  if (await rateLimit(`chat-notify:${conversationId}`, 1, 600)) await notify("system", "Cliente aguardando atendimento no chat", `${c.name ?? "Visitante"}${c.email ? ` · ${c.email}` : ""} — ${reason.slice(0, 100)}`, `/admin/atendimento?c=${conversationId}`);
}
