"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createResetToken, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { appUrl, sendMail } from "@/lib/mail";
import { fail, ok, str, type ActionState } from "@/lib/action";

export async function createAdminUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("ADMIN");
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name");
  const role = str(fd, "role") === "ADMIN" ? "ADMIN" : "OPERATOR";
  if (!z.string().email().safeParse(email).success || name.length < 2) return fail("Informe nome e e-mail válidos.");
  if (await prisma.adminUser.findUnique({ where: { email } })) return fail("Já existe um usuário com este e-mail.");
  const user = await prisma.adminUser.create({ data: { email, name, role } });
  const token = await createResetToken(user.id);
  await sendMail(email, "Convite — Painel Portal Consumidor", `Olá, ${name}.\n\nVocê foi convidado(a) para acessar o painel administrativo do Portal Consumidor.\n\nDefina sua senha pelo link abaixo (válido por 1 hora):\n${appUrl()}/admin/redefinir-senha?token=${token}\n\nSe o link expirar, use "Esqueci minha senha" na tela de login.`);
  await audit(admin.id, "admin_user.created", "AdminUser", user.id, { email, role });
  revalidatePath("/admin/seguranca");
  return ok("Usuário criado. Um convite para definir a senha foi enviado por e-mail.");
}

export async function updateAdminUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("ADMIN");
  const id = str(fd, "id");
  if (id === admin.id) return fail("Você não pode alterar o próprio perfil ou desativar a própria conta.");
  const op = str(fd, "op");
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) return fail("Usuário não encontrado.");
  if (op === "toggle") {
    await prisma.adminUser.update({ where: { id }, data: { active: !user.active } });
    if (user.active) await prisma.adminSession.deleteMany({ where: { userId: id } });
  } else if (op === "role") {
    await prisma.adminUser.update({ where: { id }, data: { role: user.role === "ADMIN" ? "OPERATOR" : "ADMIN" } });
  } else if (op === "unlock") {
    await prisma.adminUser.update({ where: { id }, data: { lockedUntil: null, failedLogins: 0 } });
  } else return fail("Operação inválida.");
  await audit(admin.id, `admin_user.${op}`, "AdminUser", id);
  revalidatePath("/admin/seguranca");
  return ok("Usuário atualizado.");
}

export async function revokeSessionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const s = await prisma.adminSession.findUnique({ where: { id } });
  if (!s) return fail("Sessão não encontrada.");
  if (s.userId !== admin.id && admin.role !== "ADMIN") return fail("Sem permissão.");
  if (s.id === admin.sessionId) return fail("Para encerrar a sessão atual, use Sair.");
  await prisma.adminSession.delete({ where: { id } });
  await audit(admin.id, "auth.session_revoked", "AdminSession", id, { userId: s.userId });
  revalidatePath("/admin/seguranca");
  return ok("Sessão encerrada.");
}
