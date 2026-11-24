/**
 * Política de retenção (LGPD): anonimiza solicitações encerradas (finalizadas, canceladas ou recusadas)
 * há mais tempo que o prazo configurado em Configurações → Retenção de dados. Também limpa registros técnicos.
 * Agende diariamente (cron): npm run retention
 */
import { PrismaClient } from "@prisma/client";
import { createCipheriv, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function encryptJson(v: unknown): string {
  const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY inválida.");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(JSON.stringify(v)), c.final()]);
  return Buffer.concat([Buffer.from([1]), iv, c.getAuthTag(), data]).toString("base64");
}

async function main() {
  const row = await prisma.setting.findUnique({ where: { key: "privacy.retention" } });
  const days = (row?.value as { retentionDays?: number } | null)?.retentionDays ?? 1825;
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const targets = await prisma.serviceRequest.findMany({
    where: { anonymizedAt: null, status: { in: ["FINALIZADO", "CANCELADO", "RECUSADO"] }, updatedAt: { lt: cutoff } },
    select: { id: true },
  });
  for (const t of targets) {
    await prisma.$transaction([
      prisma.document.deleteMany({ where: { requestId: t.id } }),
      prisma.adminNote.deleteMany({ where: { requestId: t.id } }),
      prisma.serviceRequest.update({ where: { id: t.id }, data: { detailsEnc: encryptJson({ anonymized: true }), anonymizedAt: new Date(), ipHash: null } }),
    ]);
  }
  const now = new Date();
  const [sessions, tokens, limits] = await Promise.all([
    prisma.adminSession.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 86_400_000) } } }),
  ]);
  await prisma.auditLog.create({ data: { action: "retention.run", meta: { anonymized: targets.length, days, sessions: sessions.count, tokens: tokens.count, rateLimits: limits.count } } });
  console.log(`Retenção (${days} dias): ${targets.length} solicitação(ões) anonimizada(s); ${sessions.count} sessões e ${tokens.count} tokens expirados removidos.`);
  await prisma.$disconnect();
}
main();
