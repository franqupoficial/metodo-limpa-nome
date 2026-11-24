import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { keyedHash } from "./crypto";
import { sendMail, appUrl } from "./mail";
import { resolveSegment } from "./segment-resolve";

export const unsubToken = (email: string) => keyedHash(`unsub:${email.toLowerCase()}`).slice(0, 32);
export const unsubUrl = (email: string) => `${appUrl()}/descadastrar?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;

/** Destinatários: SEMPRE apenas quem consentiu (cliente com opt-in ou lead não descadastrado). */
export async function campaignRecipients(segmentId: string | null): Promise<{ email: string; name: string | null }[]> {
  if (segmentId === "leads") {
    const leads = await prisma.lead.findMany({ where: { unsubscribedAt: null }, select: { email: true, name: true } });
    return leads;
  }
  const seg = await resolveSegment(segmentId);
  const where: Prisma.CustomerWhereInput = { AND: [seg?.where ?? { anonymizedAt: null }, { marketingOptIn: true, anonymizedAt: null }] };
  const customers = await prisma.customer.findMany({ where, select: { email: true, name: true } });
  if (segmentId) return customers;
  // sem segmento: clientes com opt-in + leads da newsletter, sem duplicar
  const leads = await prisma.lead.findMany({ where: { unsubscribedAt: null }, select: { email: true, name: true } });
  const seen = new Set(customers.map((c) => c.email));
  return [...customers, ...leads.filter((l) => !seen.has(l.email))];
}

/** Rotina: envia campanhas agendadas em lotes (respeita limites do provedor SMTP). */
export async function processCampaigns(batch = 200) {
  const due = await prisma.campaign.findFirst({ where: { status: { in: ["SCHEDULED", "SENDING"] }, scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: "asc" } });
  if (!due) return null;
  const recipients = await campaignRecipients(due.segmentId);
  const already = new Set((await prisma.emailLog.findMany({ where: { template: `campaign:${due.id}` }, select: { to: true } })).map((l) => l.to));
  const pending = recipients.filter((r) => !already.has(r.email)).slice(0, batch);
  await prisma.campaign.update({ where: { id: due.id }, data: { status: "SENDING" } });
  const link = (u: string) => (due.utm ? `${u}${u.includes("?") ? "&" : "?"}${due.utm}` : u);
  for (const r of pending) {
    await sendMail({
      to: r.email,
      template: `campaign:${due.id}`,
      subject: due.subject!,
      title: due.subject!,
      paragraphs: (due.content ?? "").split(/\n{2,}/).map((p) => p.replace(/\n/g, " ")),
      cta: { label: "Ver na loja", url: link(appUrl()) },
      extraHtml: `<p style="font-size:11px;color:#999;margin-top:28px">Você recebe este e-mail porque autorizou comunicações da Luxer Joias. <a href="${unsubUrl(r.email)}" style="color:#999">Descadastrar</a>.</p>`,
    });
  }
  const done = already.size + pending.length >= recipients.length;
  await prisma.campaign.update({ where: { id: due.id }, data: { recipients: already.size + pending.length, ...(done ? { status: "SENT", sentAt: new Date() } : {}) } });
  return { campaign: due.name, sent: pending.length, done };
}
