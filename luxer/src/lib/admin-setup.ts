import { timingSafeEqual, createHash } from "node:crypto";
import { prisma } from "./db";

/**
 * Primeiro acesso ao painel (criação da conta master sem terminal).
 * Só funciona quando: (1) a variável ADMIN_SETUP_CODE está definida na hospedagem (mín. 12 caracteres) e
 * (2) ainda não existe nenhum Proprietário ativo. Depois que a conta master existe, fica desativado sozinho.
 */
export function setupCode(): string | null {
  const c = (process.env.ADMIN_SETUP_CODE ?? "").trim();
  return c.length >= 12 ? c : null;
}
export async function setupOpen(): Promise<boolean> {
  if (!setupCode()) return false;
  return (await prisma.adminUser.count({ where: { role: "OWNER", active: true } })) === 0;
}
/** Comparação em tempo constante (não vaza o código por tempo de resposta). */
export function codeMatches(given: string): boolean {
  const c = setupCode();
  if (!c) return false;
  const a = createHash("sha256").update(given.trim()).digest(), b = createHash("sha256").update(c).digest();
  return timingSafeEqual(a, b);
}
