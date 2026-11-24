import "server-only";
import { prisma } from "./db";
import { clientIp } from "./request-meta";

export async function audit(
  adminId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: { adminId, action, entity, entityId, meta: (meta ?? undefined) as object | undefined, ip: await clientIp() },
  });
}
