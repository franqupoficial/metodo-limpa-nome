"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { BOLETO_PROVIDER, createPixCharge, emailPixCharge } from "@/lib/charges";
import { encryptBuffer, sha256 } from "@/lib/crypto";
import { readUpload, safeFileName } from "@/lib/uploads";
import { sendMail, appUrl } from "@/lib/mail";
import { formatDate, formatMoney } from "@/lib/format";
import { bool, fail, moneyToCents, ok, str, type ActionState } from "@/lib/action";

function parseCharge(fd: FormData) {
  const amountCents = moneyToCents(str(fd, "amount"));
  const description = str(fd, "description").slice(0, 120);
  const installment = Number(str(fd, "installment")) || undefined;
  const due = str(fd, "dueDate");
  const dueDate = due ? new Date(due + "T12:00:00") : null;
  return { amountCents, description, installment, dueDate };
}

export async function createPixChargeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const req = await prisma.serviceRequest.findUnique({ where: { id }, include: { customer: true } });
  if (!req) return fail("Solicitação não encontrada.");
  const c = parseCharge(fd);
  if (!c.amountCents || c.amountCents < 100) return fail("Informe o valor da cobrança.");
  if (!c.description) return fail("Informe a descrição (ex.: Parcela 2 de 24).");
  const p = await createPixCharge({ requestId: id, protocol: req.protocol, amountCents: c.amountCents, description: c.description, installment: c.installment, dueDate: c.dueDate });
  if (bool(fd, "send") && !req.anonymizedAt) await emailPixCharge(req.customer.email, req.protocol, p);
  await audit(admin.id, "payment.pix_created", "Payment", p.id, { requestId: id, amountCents: c.amountCents, sent: bool(fd, "send") });
  revalidatePath(`/admin/solicitacoes/${id}`);
  return ok(bool(fd, "send") ? "Cobrança Pix gerada e enviada por e-mail." : "Cobrança Pix gerada.");
}

export async function sendPixChargeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const p = await prisma.payment.findUnique({ where: { id: str(fd, "paymentId") }, include: { request: { include: { customer: true } } } });
  if (!p || p.method !== "PIX" || !p.pixPayload) return fail("Cobrança Pix não encontrada.");
  if (p.request.anonymizedAt) return fail("Solicitação anonimizada.");
  await emailPixCharge(p.request.customer.email, p.request.protocol, p);
  await audit(admin.id, "payment.pix_sent", "Payment", p.id);
  revalidatePath(`/admin/solicitacoes/${p.requestId}`);
  return ok("Cobrança enviada por e-mail.");
}

export async function sendBoletoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const req = await prisma.serviceRequest.findUnique({ where: { id }, include: { customer: true } });
  if (!req || req.anonymizedAt) return fail("Solicitação não encontrada.");
  const c = parseCharge(fd);
  if (!c.amountCents || c.amountCents < 100) return fail("Informe o valor do boleto.");
  if (!c.description) return fail("Informe a descrição (ex.: Parcela 2 de 24).");
  if (!c.dueDate) return fail("Informe o vencimento do boleto.");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Anexe o PDF do boleto gerado no seu banco.");
  const up = await readUpload(file, ["application/pdf"]);
  if ("error" in up) return fail(up.error);
  const name = safeFileName(file.name || "boleto.pdf");

  await sendMail(
    req.customer.email,
    `Boleto — ${c.description} — protocolo ${req.protocol}`,
    `Olá,\n\nSegue em anexo o boleto referente ao protocolo ${req.protocol}.\n\n${c.description}\nValor: ${formatMoney(c.amountCents)}\nVencimento: ${formatDate(c.dueDate)}\n\nConfira se o beneficiário é Portal Consumidor antes de pagar.\nAcompanhe em ${appUrl()}/acompanhar.\n\nPortal Consumidor`,
    [{ filename: name, content: up.buf, contentType: "application/pdf" }],
  );
  const p = await prisma.payment.create({
    data: { requestId: id, provider: BOLETO_PROVIDER, method: "BOLETO", status: "PENDING", amountCents: c.amountCents, description: c.description, installment: c.installment ?? null, dueDate: c.dueDate, sentAt: new Date() },
  });
  await prisma.document.create({ data: { requestId: id, kind: "BOLETO", originalName: name, mime: up.mime, size: up.buf.length, sha256: sha256(up.buf), dataEnc: new Uint8Array(encryptBuffer(up.buf)) } });
  await audit(admin.id, "payment.boleto_sent", "Payment", p.id, { requestId: id, amountCents: c.amountCents });
  revalidatePath(`/admin/solicitacoes/${id}`);
  return ok("Boleto enviado por e-mail e registrado.");
}

export async function setPaymentStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const p = await prisma.payment.findUnique({ where: { id: str(fd, "paymentId") } });
  if (!p) return fail("Cobrança não encontrada.");
  const op = str(fd, "op");
  if (op === "paid") await prisma.payment.update({ where: { id: p.id }, data: { status: "PAID", paidAt: new Date(), confirmedBy: admin.email } });
  else if (op === "cancel") await prisma.payment.update({ where: { id: p.id }, data: { status: "CANCELED" } });
  else if (op === "reopen") await prisma.payment.update({ where: { id: p.id }, data: { status: "PENDING", paidAt: null, confirmedBy: null } });
  else return fail("Operação inválida.");
  await audit(admin.id, `payment.${op}`, "Payment", p.id, { requestId: p.requestId, amountCents: p.amountCents });
  revalidatePath(`/admin/solicitacoes/${p.requestId}`);
  return ok(op === "paid" ? "Pagamento confirmado." : op === "cancel" ? "Cobrança cancelada." : "Cobrança reaberta.");
}
