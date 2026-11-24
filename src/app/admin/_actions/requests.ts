"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isValidStatus, statusDef } from "@/lib/status";
import { encryptJson, randomCode } from "@/lib/crypto";
import { hashAccessCode } from "@/lib/requests";
import { sendMail, appUrl } from "@/lib/mail";
import { fail, ok, str, type ActionState } from "@/lib/action";

export async function changeStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status");
  const note = str(fd, "note").slice(0, 2000);
  const publicNote = str(fd, "publicNote").slice(0, 1000);
  const notify = fd.get("notify") === "on";
  const req = await prisma.serviceRequest.findUnique({ where: { id }, include: { customer: true } });
  if (!req) return fail("Solicitação não encontrada.");
  if (!isValidStatus(req.service, status)) return fail("Status inválido para este serviço.");
  if (req.status === status && !note && !publicNote) return fail("Selecione um novo status ou informe uma observação.");
  await prisma.$transaction([
    prisma.serviceRequest.update({ where: { id }, data: { status } }),
    prisma.statusHistory.create({ data: { requestId: id, fromStatus: req.status, toStatus: status, note: note || null, publicNote: publicNote || null, adminId: admin.id } }),
  ]);
  await audit(admin.id, "request.status_changed", "ServiceRequest", id, { from: req.status, to: status });
  if (notify && !req.anonymizedAt) {
    // e-mail sem dados sensíveis
    await sendMail(req.customer.email, `Atualização da solicitação ${req.protocol}`,
      `Olá,\n\nSua solicitação ${req.protocol} foi atualizada para: ${statusDef(status).label}.\n\n${statusDef(status).nextSteps}\n\nAcompanhe em ${appUrl()}/acompanhar com seu protocolo e código de acesso.\n\nPortal Consumidor`).catch(() => {});
  }
  revalidatePath(`/admin/solicitacoes/${id}`);
  return ok("Status atualizado e registrado no histórico.");
}

export async function addNoteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const content = str(fd, "content").slice(0, 4000);
  if (content.length < 2) return fail("Escreva a observação.");
  await prisma.adminNote.create({ data: { requestId: id, adminId: admin.id, content } });
  await audit(admin.id, "request.note_added", "ServiceRequest", id);
  revalidatePath(`/admin/solicitacoes/${id}`);
  return ok("Observação adicionada.");
}

export async function regenerateAccessCodeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const req = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!req) return fail("Solicitação não encontrada.");
  const code = randomCode(8);
  await prisma.serviceRequest.update({ where: { id }, data: { accessCodeHash: hashAccessCode(req.protocol, code) } });
  await audit(admin.id, "request.access_code_regenerated", "ServiceRequest", id);
  return ok("Novo código gerado. Informe-o ao titular somente após confirmar sua identidade. Ele não será exibido novamente.", { "Código de acesso": code });
}

/** LGPD: anonimiza os dados pessoais da solicitação (mantém protocolo, status e valores para fins estatísticos/legais). */
export async function anonymizeRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("ADMIN");
  const id = str(fd, "id");
  const req = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!req) return fail("Solicitação não encontrada.");
  if (req.anonymizedAt) return fail("Solicitação já anonimizada.");
  await prisma.$transaction([
    prisma.document.deleteMany({ where: { requestId: id } }),
    prisma.adminNote.deleteMany({ where: { requestId: id } }),
    prisma.serviceRequest.update({ where: { id }, data: { detailsEnc: encryptJson({ anonymized: true }), anonymizedAt: new Date(), ipHash: null } }),
  ]);
  await audit(admin.id, "request.anonymized", "ServiceRequest", id);
  revalidatePath(`/admin/solicitacoes/${id}`);
  return ok("Dados pessoais da solicitação anonimizados.");
}
