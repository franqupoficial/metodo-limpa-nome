import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "./db";
import { formatMoney } from "./format";

export const appUrl = () => (process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "");
export const mailConfigured = () => Boolean(process.env.SMTP_HOST);

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Layout HTML da marca para todos os e-mails. Conteúdo recebido já escapado. */
function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f1ec;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
<tr><td style="background:#0b0b0c;padding:28px;text-align:center;color:#c9a96e;font-family:Georgia,serif;font-size:24px;letter-spacing:6px">LUXER</td></tr>
<tr><td style="padding:36px 32px">
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 20px">${esc(title)}</h1>
${bodyHtml}
${cta ? `<p style="margin:28px 0 0"><a href="${esc(cta.url)}" style="display:inline-block;background:#0b0b0c;color:#c9a96e;text-decoration:none;padding:14px 26px;font-size:13px;letter-spacing:2px;text-transform:uppercase">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #eee;font-size:12px;color:#888">Luxer Joias · Curitiba/PR · Esta é uma mensagem automática.</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (t: string) => `<p style="font-size:15px;line-height:1.6;margin:0 0 14px">${esc(t)}</p>`;

export type MailMessage = { to: string; subject: string; template: string; title: string; paragraphs: string[]; cta?: { label: string; url: string }; extraHtml?: string; orderId?: string };

/**
 * Envia e registra o e-mail. NUNCA inclua CPF, dados de cartão ou documentos.
 * Sem SMTP configurado, registra no console e no log como "dev" (não é marcado como enviado).
 */
export async function sendMail(m: MailMessage) {
  const html = layout(m.title, m.paragraphs.map(p).join("") + (m.extraHtml ?? ""), m.cta);
  const text = [m.title, "", ...m.paragraphs, m.cta ? `\n${m.cta.label}: ${m.cta.url}` : ""].join("\n");
  let status = "sent";
  let error: string | undefined;
  try {
    if (!mailConfigured()) {
      status = "dev";
      console.info(`[mail:dev] Para: ${m.to.replace(/^(.{2})[^@]*/, "$1***")} | ${m.subject}`);
    } else {
      await getTransporter().sendMail({ from: process.env.SMTP_FROM, to: m.to, subject: m.subject, text, html });
    }
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message.slice(0, 500) : String(e);
    console.error("[mail] falha", error);
  }
  await prisma.emailLog.create({ data: { to: m.to, template: m.template, subject: m.subject, status, error, orderId: m.orderId } }).catch(() => {});
  return status;
}

type OrderForMail = {
  id: string;
  number: number;
  publicToken: string;
  name: string;
  email: string;
  totalCents: number;
  items: { name: string; option: string | null; quantity: number; totalCents: number }[];
  trackingCode?: string | null;
  trackingUrl?: string | null;
};

const orderUrl = (o: OrderForMail) => `${appUrl()}/pedido/${o.publicToken}`;
const itemsTable = (o: OrderForMail) =>
  `<table width="100%" style="border-collapse:collapse;margin:18px 0;font-size:14px">${o.items
    .map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.name)}${i.option ? ` — ${esc(i.option)}` : ""} × ${i.quantity}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee">${formatMoney(i.totalCents)}</td></tr>`)
    .join("")}<tr><td style="padding:10px 0"><b>Total</b></td><td align="right"><b>${formatMoney(o.totalCents)}</b></td></tr></table>`;

export const orderMails = {
  created: (o: OrderForMail, pix: boolean) =>
    sendMail({
      to: o.email, orderId: o.id, template: "order.created", subject: `Pedido #${o.number} recebido — Luxer Joias`,
      title: `Recebemos seu pedido #${o.number}`,
      paragraphs: [`Olá, ${o.name.split(" ")[0]}.`, pix ? "Seu pedido está aguardando o pagamento via Pix. O código Pix fica disponível na página do pedido até o vencimento." : "Seu pagamento está em análise pela operadora do cartão. Avisaremos assim que for aprovado."],
      extraHtml: itemsTable(o), cta: { label: "Acompanhar pedido", url: orderUrl(o) },
    }),
  paid: (o: OrderForMail) =>
    sendMail({
      to: o.email, orderId: o.id, template: "order.paid", subject: `Pagamento aprovado — pedido #${o.number}`,
      title: "Pagamento aprovado", paragraphs: [`Olá, ${o.name.split(" ")[0]}.`, `O pagamento do pedido #${o.number} foi confirmado. Sua joia já está sendo preparada.`],
      extraHtml: itemsTable(o), cta: { label: "Ver pedido", url: orderUrl(o) },
    }),
  shipped: (o: OrderForMail) =>
    sendMail({
      to: o.email, orderId: o.id, template: "order.shipped", subject: `Seu pedido #${o.number} foi enviado`,
      title: "Seu pedido está a caminho",
      paragraphs: [`Olá, ${o.name.split(" ")[0]}.`, o.trackingCode ? `Código de rastreamento: ${o.trackingCode}` : "Seu pedido foi despachado."],
      cta: { label: "Rastrear pedido", url: o.trackingUrl || orderUrl(o) },
    }),
  delivered: (o: OrderForMail) =>
    sendMail({
      to: o.email, orderId: o.id, template: "order.delivered", subject: `Pedido #${o.number} entregue`,
      title: "Pedido entregue", paragraphs: [`Olá, ${o.name.split(" ")[0]}.`, "Seu pedido foi entregue. Esperamos que você ame sua joia. Se quiser, conte para outras pessoas o que achou avaliando o produto."],
      cta: { label: "Avaliar minha compra", url: orderUrl(o) },
    }),
  canceled: (o: OrderForMail, reason?: string) =>
    sendMail({
      to: o.email, orderId: o.id, template: "order.canceled", subject: `Pedido #${o.number} cancelado`,
      title: "Pedido cancelado", paragraphs: [`Olá, ${o.name.split(" ")[0]}.`, `O pedido #${o.number} foi cancelado.${reason ? ` Motivo: ${reason}` : ""}`, "Em caso de dúvidas, fale com a nossa equipe."],
      cta: { label: "Ver pedido", url: orderUrl(o) },
    }),
  refunded: (o: OrderForMail, cents: number) =>
    sendMail({
      to: o.email, orderId: o.id, template: "order.refunded", subject: `Reembolso do pedido #${o.number}`,
      title: "Reembolso processado", paragraphs: [`Olá, ${o.name.split(" ")[0]}.`, `Processamos o reembolso de ${formatMoney(cents)} referente ao pedido #${o.number}. O prazo de crédito depende do meio de pagamento e do banco emissor.`],
      cta: { label: "Ver pedido", url: orderUrl(o) },
    }),
};
