import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { AdminRole } from "@prisma/client";
import { prisma } from "./db";
import { randomToken, sha256 } from "./crypto";
import { clientIp, userAgent } from "./request-meta";
import { effectivePermissions, type Permission } from "./permissions";

export const ADMIN_COOKIE = process.env.NODE_ENV === "production" ? "__Host-lx_admin" : "lx_admin";
const SESSION_TTL_MS = 10 * 60 * 60 * 1000; // 10 horas
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora de inatividade
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;

export const PASSWORD_RULES = "Mínimo de 12 caracteres, com letras maiúsculas, minúsculas, números e símbolo.";
export function passwordIsStrong(p: string): boolean {
  return p.length >= 12 && p.length <= 128 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);
}
export const hashPassword = (p: string) => bcrypt.hash(p, 12);
const DUMMY_HASH = "$2b$12$Hvd8TBYyd2xO/E24ccQ9Su2N9hiW9nW6QFPxUzTzfeKp/rVj7SwYK";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function adminLogin(emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.adminUser.findUnique({ where: { email } });
  const generic = { ok: false as const, error: "E-mail ou senha incorretos." };
  if (!user || !user.active || !user.passwordHash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, error: "Acesso temporariamente bloqueado por excesso de tentativas. Tente novamente em 15 minutos." };
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLogins: failed >= MAX_FAILED ? 0 : failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MS) : null },
    });
    await prisma.auditLog.create({ data: { adminId: user.id, action: "auth.login_failed", ip: await clientIp() } });
    return generic;
  }
  await prisma.adminUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.adminSession.create({
    data: { tokenHash: sha256(token), userId: user.id, expiresAt, ip: await clientIp(), userAgent: await userAgent() },
  });
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
  await prisma.auditLog.create({ data: { adminId: user.id, action: "auth.login", ip: await clientIp() } });
  return { ok: true };
}

export async function adminLogout() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) await prisma.adminSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(ADMIN_COOKIE);
}

export type SessionAdmin = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  sessionId: string;
  permissions: Set<Permission>;
  can: (p: Permission) => boolean;
};

export const getCurrentAdmin = cache(async (): Promise<SessionAdmin | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() < now || now - session.lastSeenAt.getTime() > IDLE_TIMEOUT_MS || !session.user.active) {
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (now - session.lastSeenAt.getTime() > 60_000) {
    await prisma.adminSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  const u = session.user;
  const permissions = effectivePermissions(u.role, u.grants, u.denies);
  return { id: u.id, email: u.email, name: u.name, role: u.role, sessionId: session.id, permissions, can: (p) => permissions.has(p) };
});

export class ForbiddenError extends Error {
  constructor(public permission: Permission) {
    super("Você não tem permissão para esta operação.");
  }
}

/** Para páginas: redireciona ao login ou à tela de acesso negado. */
export async function requireAdmin(permission?: Permission): Promise<SessionAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (permission && !admin.can(permission)) redirect(`/admin/sem-permissao?p=${permission}`);
  return admin;
}

/** Para server actions e APIs: lança erro em vez de redirecionar. */
export async function assertAdmin(permission?: Permission): Promise<SessionAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new ForbiddenError(permission ?? "dashboard.view");
  if (permission && !admin.can(permission)) throw new ForbiddenError(permission);
  return admin;
}

export async function createResetToken(userId: string): Promise<string> {
  const token = randomToken(32);
  await prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.passwordResetToken.create({ data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  return token;
}

export async function consumeResetToken(token: string, newPassword: string): Promise<LoginResult> {
  if (!passwordIsStrong(newPassword)) return { ok: false, error: PASSWORD_RULES };
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { ok: false, error: "Link inválido ou expirado. Solicite uma nova redefinição." };
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.adminUser.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(newPassword), failedLogins: 0, lockedUntil: null } }),
    prisma.adminSession.deleteMany({ where: { userId: row.userId } }),
    prisma.auditLog.create({ data: { adminId: row.userId, action: "auth.password_reset", ip: await clientIp() } }),
  ]);
  return { ok: true };
}
