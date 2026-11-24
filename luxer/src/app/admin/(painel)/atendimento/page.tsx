import Link from "next/link";
import type { ChatStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatPhone } from "@/lib/format";
import { aiSupportConfigured } from "@/lib/ai/support";
import { getSettings } from "@/lib/settings";
import { PageHeader, Card, Badge, Empty, Alert } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { ChatThread } from "@/components/admin/ChatThread";
import { agentReply, chatOp } from "../../_actions/chat";

export const metadata = { title: "Atendimento" };
const ST: Record<ChatStatus, ["amber" | "blue" | "green" | "gray" | "gold", string]> = { WAITING_HUMAN: ["amber", "Aguardando equipe"], HUMAN: ["blue", "Com atendente"], AI: ["gold", "Com a IA"], CLOSED: ["gray", "Encerrada"] };

export default async function Inbox({ searchParams }: { searchParams: Promise<{ c?: string; f?: string }> }) {
  const admin = await requireAdmin("support.chat");
  const sp = await searchParams;
  const f = sp.f ?? "fila";
  const where = f === "fila" ? { status: { in: ["WAITING_HUMAN", "HUMAN"] as ChatStatus[] } } : f === "ia" ? { status: "AI" as ChatStatus } : f === "encerradas" ? { status: "CLOSED" as ChatStatus } : {};
  const [list, counts, s] = await Promise.all([
    prisma.chatConversation.findMany({ where: { ...where, messages: { some: { role: "USER" } } }, orderBy: [{ unreadAdmin: "desc" }, { lastMessageAt: "desc" }], take: 60, include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } }),
    prisma.chatConversation.groupBy({ by: ["status"], where: { messages: { some: { role: "USER" } } }, _count: true }),
    getSettings(),
  ]);
  const n = Object.fromEntries(counts.map((c) => [c.status, c._count])) as Record<string, number>;
  const cur = sp.c ? await prisma.chatConversation.findUnique({ where: { id: sp.c }, include: { messages: { orderBy: { createdAt: "asc" } }, customer: { select: { id: true, ordersCount: true } } } }) : null;
  const assigned = cur?.assignedAdminId ? await prisma.adminUser.findUnique({ where: { id: cur.assignedAdminId }, select: { name: true } }) : null;
  const tabs: [string, string, number][] = [["fila", "Fila humana", (n.WAITING_HUMAN ?? 0) + (n.HUMAN ?? 0)], ["ia", "Com a IA", n.AI ?? 0], ["encerradas", "Encerradas", n.CLOSED ?? 0], ["todas", "Todas", Object.values(n).reduce((a, b) => a + b, 0)]];
  return (
    <>
      <PageHeader title="Atendimento" subtitle="Conversas do Concierge Luxer. A IA responde primeiro; quando o cliente pede (ou a IA identifica a necessidade), a conversa entra na fila da equipe." />
      {!aiSupportConfigured() && <div className="mb-4"><Alert>ANTHROPIC_API_KEY não configurada: o chat funciona somente com atendimento humano.</Alert></div>}
      {!s.concierge.enabled && <div className="mb-4"><Alert tone="red">O chat está desativado na loja (Luxer AI → Concierge).</Alert></div>}
      <div className="mb-4 flex flex-wrap gap-1">{tabs.map(([k, l, c]) => <Link key={k} href={`?f=${k}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${f === k ? "bg-zinc-900 text-[#f3e7cf]" : "bg-white ring-1 ring-zinc-200"}`}>{l} {c}</Link>)}</div>
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <Card pad={false}>
          {list.length === 0 ? <Empty title="Nenhuma conversa" /> : (
            <ul className="divide-y divide-zinc-100">{list.map((c) => (
              <li key={c.id}><Link href={`?f=${f}&c=${c.id}`} className={`block px-4 py-3 hover:bg-zinc-50 ${c.id === cur?.id ? "bg-[#fbf7ef]" : ""}`}>
                <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{c.name ?? "Visitante"}</span>{c.unreadAdmin > 0 && <span className="rounded-full bg-[#c9a96e] px-1.5 text-[10px] font-bold">{c.unreadAdmin}</span>}</div>
                <div className="truncate text-xs text-zinc-500">{c.messages[0]?.body}</div>
                <div className="mt-1 flex items-center justify-between"><Badge tone={ST[c.status][0]}>{ST[c.status][1]}</Badge><span className="text-[10px] text-zinc-400">{formatDate(c.lastMessageAt, true)}</span></div>
              </Link></li>
            ))}</ul>
          )}
        </Card>
        {cur ? (
          <Card pad={false} title={<span className="flex flex-wrap items-center gap-2">{cur.name ?? "Visitante"} <Badge tone={ST[cur.status][0]}>{ST[cur.status][1]}</Badge>{assigned && <span className="text-xs font-normal text-zinc-500">com {assigned.name}</span>}</span>}
            actions={<div className="flex flex-wrap gap-1">
              {cur.assignedAdminId !== admin.id && cur.status !== "CLOSED" && <ActionButton action={chatOp} fields={{ id: cur.id, op: "assign" }} label="Assumir" className="btn !py-1 text-xs" />}
              {cur.status !== "AI" && cur.status !== "CLOSED" && <ActionButton action={chatOp} fields={{ id: cur.id, op: "ai" }} label="Devolver à IA" className="btn !py-1 text-xs" />}
              {cur.status !== "CLOSED" && <ActionButton action={chatOp} fields={{ id: cur.id, op: "close" }} label="Encerrar" className="btn btn-danger !py-1 text-xs" confirm="Encerrar o atendimento?" />}
            </div>}>
            <div className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-600">
              {cur.email && <span className="mr-3">{cur.email}</span>}{cur.phone && <span className="mr-3">{formatPhone(cur.phone)} · <a className="text-emerald-700 underline" target="_blank" rel="noreferrer" href={`https://wa.me/55${cur.phone}`}>WhatsApp</a></span>}
              {cur.customer && <Link className="mr-3 underline" href={`/admin/clientes/${cur.customer.id}`}>cliente · {cur.customer.ordersCount} pedido(s)</Link>}
              {cur.page && <span className="mr-3">página: {cur.page}</span>}{cur.handoffReason && <span>motivo: {cur.handoffReason}</span>}
            </div>
            <ChatThread id={cur.id} initial={cur.messages.map((m) => ({ id: m.id, role: m.role, body: m.body, adminName: m.adminName, at: m.createdAt.toISOString(), products: ((m.meta as { products?: { name: string; slug: string }[] } | null)?.products ?? []) }))} />
            {cur.status !== "CLOSED" && (
              <ActionForm action={agentReply} className="border-t border-zinc-100 p-3" resetOnSuccess>
                <input type="hidden" name="id" value={cur.id} />
                <textarea name="body" rows={3} required placeholder="Escreva sua resposta… (o cliente vê na hora, no chat da loja)" className="input" />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {cur.email ? <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="notifyEmail" /> Avisar também por e-mail</label> : <span />}
                  <Submit pendingText="Enviando…">Responder</Submit>
                </div>
              </ActionForm>
            )}
          </Card>
        ) : <Card><Empty title="Selecione uma conversa" /></Card>}
      </div>
    </>
  );
}
