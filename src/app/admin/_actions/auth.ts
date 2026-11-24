"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { consumeResetToken, createResetToken, login, logout, getCurrentAdmin, hashPassword, passwordIsStrong, PASSWORD_RULES } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-meta";
import { sendMail, appUrl } from "@/lib/mail";
import { fail, ok, str, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`login:${ip}`, 10, 900))) return fail("Muitas tentativas. Aguarde 15 minutos.");
  const email = str(fd, "email");
  const password = String(fd.get("password") ?? "");
  if (!z.string().email().safeParse(email).success || !password) return fail("Informe e-mail e senha.");
  const r = await login(email, password);
  if (!r.ok) return fail(r.error);
  redirect("/admin");
}

export async function logoutAction() {
  const admin = await getCurrentAdmin();
  if (admin) await audit(admin.id, "auth.logout");
  await logout();
  redirect("/admin/login");
}

export async function requestResetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`reset:${ip}`, 5, 3600))) return fail("Muitas solicitações. Tente novamente mais tarde.");
  const email = str(fd, "email").toLowerCase();
  if (!z.string().email().safeParse(email).success) return fail("Informe um e-mail válido.");
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (user?.active) {
    const token = await createResetToken(user.id);
    await sendMail(
      user.email,
      "Redefinição de senha — Painel Portal Consumidor",
      `Olá, ${user.name}.\n\nRecebemos uma solicitação para definir ou redefinir sua senha de acesso ao painel administrativo.\n\nAcesse o link abaixo (válido por 1 hora):\n${appUrl()}/admin/redefinir-senha?token=${token}\n\nSe você não fez esta solicitação, ignore este e-mail.\n`,
    );
    await prisma.auditLog.create({ data: { adminId: user.id, action: "auth.reset_requested", ip } });
  }
  // resposta genérica: não revela se o e-mail existe
  return ok("Se o e-mail estiver cadastrado, você receberá um link para definir a senha em instantes. O link é válido por 1 hora.");
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`resetuse:${ip}`, 10, 3600))) return fail("Muitas tentativas. Tente novamente mais tarde.");
  const token = str(fd, "token");
  const p1 = String(fd.get("password") ?? "");
  const p2 = String(fd.get("confirm") ?? "");
  if (p1 !== p2) return fail("As senhas não conferem.");
  const r = await consumeResetToken(token, p1);
  if (!r.ok) return fail(r.error);
  return ok("Senha definida com sucesso. Você já pode entrar no painel.");
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  const current = String(fd.get("current") ?? "");
  const p1 = String(fd.get("password") ?? "");
  const p2 = String(fd.get("confirm") ?? "");
  if (p1 !== p2) return fail("As senhas não conferem.");
  if (!passwordIsStrong(p1)) return fail(PASSWORD_RULES);
  const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id } });
  if (!user.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) return fail("Senha atual incorreta.");
  await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(p1) } });
  await prisma.adminSession.deleteMany({ where: { userId: admin.id, id: { not: admin.sessionId } } });
  await audit(admin.id, "auth.password_changed");
  return ok("Senha alterada. As demais sessões foram encerradas.");
}
