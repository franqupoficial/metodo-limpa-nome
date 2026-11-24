"use server";
import { revalidatePath } from "next/cache";
import type { AdminRole } from "@prisma/client";
import { assertAdmin, ForbiddenError, hashPassword, passwordIsStrong, PASSWORD_RULES, createResetToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit, diff } from "@/lib/audit";
import { sendMail, appUrl } from "@/lib/mail";
import { PERMISSIONS } from "@/lib/permissions";
import { isValidEmail } from "@/lib/validators";
import { bool, fail, ok, str, type ActionState } from "@/lib/action";

async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(e.message);
    console.error(e);
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

// ───────── Avaliações ─────────
async function refreshRating(productId: string) {
  const a = await prisma.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: true });
  await prisma.product.update({ where: { id: productId }, data: { ratingAvg: a._avg.rating, ratingCount: a._count } });
}

export async function moderateReview(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("reviews.moderate");
    const r = await prisma.review.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    const op = str(fd, "op");
    if (op === "approve" || op === "reject") {
      await prisma.review.update({ where: { id: r.id }, data: { status: op === "approve" ? "APPROVED" : "REJECTED", moderatedBy: admin.name } });
      await prisma.reviewReport.updateMany({ where: { reviewId: r.id, resolvedAt: null }, data: { resolvedAt: new Date() } });
    } else if (op === "reply") {
      const reply = str(fd, "reply").slice(0, 1500);
      await prisma.review.update({ where: { id: r.id }, data: { reply: reply || null, repliedAt: reply ? new Date() : null } });
    } else if (op === "delete") {
      await prisma.review.delete({ where: { id: r.id } });
    }
    await refreshRating(r.productId);
    await audit(admin.id, `review.${op}`, "Review", r.id);
    revalidatePath("/admin/avaliacoes");
    return ok("Avaliação atualizada.");
  });
}

// ───────── Usuários ─────────
export async function saveAdminUser(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("users.manage");
    const id = str(fd, "id") || undefined;
    const email = str(fd, "email").toLowerCase();
    if (!isValidEmail(email)) return fail("E-mail inválido.");
    const role = str(fd, "role") as AdminRole;
    if (!["OWNER", "ADMIN", "MANAGER", "OPERATOR", "MARKETING"].includes(role)) return fail("Perfil inválido.");
    if (role === "OWNER" && admin.role !== "OWNER") return fail("Somente um proprietário pode criar outro proprietário.");
    const grants = fd.getAll("grants").map(String).filter((p) => p in PERMISSIONS);
    const denies = fd.getAll("denies").map(String).filter((p) => p in PERMISSIONS);
    const before = id ? await prisma.adminUser.findUnique({ where: { id } }) : null;
    if (before && before.role === "OWNER" && admin.role !== "OWNER") return fail("Somente um proprietário pode alterar outro proprietário.");
    const active = bool(fd, "active");
    if (before && before.id === admin.id && (!active || role !== before.role)) return fail("Você não pode desativar nem rebaixar o próprio acesso.");
    if (before?.role === "OWNER" && (role !== "OWNER" || !active)) {
      const owners = await prisma.adminUser.count({ where: { role: "OWNER", active: true } });
      if (owners <= 1) return fail("A loja precisa de ao menos um proprietário ativo.");
    }
    const data = { email, name: str(fd, "name"), role, grants, denies, active };
    const u = before ? await prisma.adminUser.update({ where: { id: before.id }, data }) : await prisma.adminUser.create({ data });
    if (before && !active) await prisma.adminSession.deleteMany({ where: { userId: u.id } });
    if (!before) {
      const token = await createResetToken(u.id);
      await sendMail({ to: email, template: "admin.invite", subject: "Seu acesso ao painel Luxer", title: "Você foi convidado(a) para o painel da Luxer Joias", paragraphs: [`${admin.name} criou seu acesso como ${role}.`, "Defina sua senha pelo link abaixo (válido por 1 hora). Depois, use “Esqueci minha senha” se precisar de um novo link."], cta: { label: "Definir senha", url: `${appUrl()}/admin/redefinir-senha?token=${token}` } });
    }
    await audit(admin.id, before ? "user.update" : "user.create", "AdminUser", u.id, { changes: diff(before as never, u as never, ["updatedAt", "passwordHash", "failedLogins", "lockedUntil", "lastLoginAt"]) });
    revalidatePath("/admin/usuarios");
    return ok(before ? "Usuário atualizado." : "Usuário criado. Um convite para definir a senha foi enviado por e-mail.", { redirect: "/admin/usuarios" });
  });
}

export async function changeOwnPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin();
    const pass = str(fd, "password");
    if (!passwordIsStrong(pass)) return fail(PASSWORD_RULES);
    if (pass !== str(fd, "confirm")) return fail("As senhas não conferem.");
    const bcrypt = (await import("bcryptjs")).default;
    const u = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id } });
    if (!u.passwordHash || !(await bcrypt.compare(str(fd, "current"), u.passwordHash))) return fail("Senha atual incorreta.");
    await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(pass) } });
    await prisma.adminSession.deleteMany({ where: { userId: admin.id, NOT: { id: admin.sessionId } } });
    await audit(admin.id, "auth.password_change", "AdminUser", admin.id);
    return ok("Senha alterada. As outras sessões foram encerradas.");
  });
}

export async function revokeSession(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin();
    const s = await prisma.adminSession.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    if (s.userId !== admin.id && !admin.can("users.manage")) return fail("Sem permissão.");
    await prisma.adminSession.delete({ where: { id: s.id } });
    await audit(admin.id, "auth.session_revoke", "AdminUser", s.userId);
    return ok("Sessão encerrada.");
  });
}
