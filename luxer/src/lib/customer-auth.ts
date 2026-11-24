import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { randomToken, sha256 } from "./crypto";

export const CUSTOMER_COOKIE = process.env.NODE_ENV === "production" ? "__Host-lx_cliente" : "lx_cliente";
const TTL = 30 * 24 * 60 * 60 * 1000;
const DUMMY = "$2b$12$Hvd8TBYyd2xO/E24ccQ9Su2N9hiW9nW6QFPxUzTzfeKp/rVj7SwYK";

export const customerPasswordOk = (p: string) => p.length >= 8 && p.length <= 128 && /[A-Za-z]/.test(p) && /\d/.test(p);
export const CUSTOMER_PASSWORD_RULES = "Mínimo de 8 caracteres, com letras e números.";

export async function startCustomerSession(customerId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + TTL);
  await prisma.customerSession.create({ data: { tokenHash: sha256(token), customerId, expiresAt } });
  (await cookies()).set(CUSTOMER_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function customerLogin(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const c = await prisma.customer.findUnique({ where: { email } });
  if (!c || !c.passwordHash || c.anonymizedAt) {
    await bcrypt.compare(password, DUMMY);
    return null;
  }
  if (!(await bcrypt.compare(password, c.passwordHash))) return null;
  await startCustomerSession(c.id);
  return c;
}

export async function customerLogout() {
  const jar = await cookies();
  const t = jar.get(CUSTOMER_COOKIE)?.value;
  if (t) await prisma.customerSession.deleteMany({ where: { tokenHash: sha256(t) } });
  jar.delete(CUSTOMER_COOKIE);
}

export const getCustomer = cache(async () => {
  const t = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!t) return null;
  const s = await prisma.customerSession.findUnique({ where: { tokenHash: sha256(t) }, include: { customer: true } });
  if (!s || s.expiresAt < new Date() || s.customer.anonymizedAt) return null;
  return s.customer;
});

export async function createCustomerToken(customerId: string, purpose: "reset", hours = 1) {
  const token = randomToken(32);
  await prisma.customerToken.create({ data: { customerId, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + hours * 3600_000) } });
  return token;
}

export async function consumeCustomerToken(token: string, purpose: string) {
  const row = await prisma.customerToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt < new Date()) return null;
  await prisma.customerToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return row.customerId;
}
