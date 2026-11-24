"use server";
import { redirect } from "next/navigation";
import { adminLogin, adminLogout, createResetToken, consumeResetToken, getCurrentAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-meta";
import { prisma } from "@/lib/db";
import { sendMail, appUrl } from "@/lib/mail";
import { str, type ActionState, fail, ok } from "@/lib/action";

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const ip = await clientIp();
  if (!(await rateLimit(`admin-login:ip:${ip}`, 20, 900)) || !(await rateLimit(`admin-login:email:${email}`, 8, 900)))
    return fail("Muitas tentativas. Aguarde 15 minutos.");
  const r = await adminLogin(email, String(fd.get("password") ?? ""));
  if (!r.ok) return fail(r.error);
  const next = str(fd, "next");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction() {
  await adminLogout();
  redirect("/admin/login");
}

export async function forgotAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const ip = await clientIp();
  if (!(await rateLimit(`admin-forgot:${ip}`, 5, 3600))) return fail("Muitas solicitações. Tente mais tarde.");
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (user?.active) {
    const token = await createResetToken(user.id);
    await sendMail({
      to: email, template: "admin.reset", subject: "Redefinição de senha — Painel Luxer",
      title: "Redefinição de senha", paragraphs: ["Recebemos um pedido para redefinir a senha do painel administrativo.", "O link vale por 1 hora. Se não foi você, ignore este e-mail."],
      cta: { label: "Definir nova senha", url: `${appUrl()}/admin/redefinir-senha?token=${token}` },
    });
  }
  return ok("Se o e-mail estiver cadastrado, enviaremos um link de redefinição.");
}

export async function resetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const pass = String(fd.get("password") ?? "");
  if (pass !== String(fd.get("confirm") ?? "")) return fail("As senhas não conferem.");
  const r = await consumeResetToken(str(fd, "token"), pass);
  if (!r.ok) return fail(r.error);
  return ok("Senha definida. Faça login.", { redirect: "/admin/login" });
}

export async function markNotificationsRead() {
  const a = await getCurrentAdmin();
  if (!a) return;
  await prisma.adminNotification.updateMany({ where: { readAt: null, OR: [{ adminId: a.id }, { adminId: null }] }, data: { readAt: new Date() } });
}
