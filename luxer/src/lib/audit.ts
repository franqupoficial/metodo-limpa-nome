import "server-only";
import { prisma } from "./db";
import { clientIp } from "./request-meta";

type Plain = Record<string, unknown>;

/** Calcula { campo: [antes, depois] } apenas para campos alterados. */
export function diff(before: Plain | null | undefined, after: Plain | null | undefined, ignore: string[] = ["updatedAt"]): Plain | null {
  if (!before || !after) return null;
  const out: Plain = {};
  for (const k of Object.keys(after)) {
    if (ignore.includes(k)) continue;
    const a = norm(before[k]);
    const b = norm(after[k]);
    if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = [a, b];
  }
  return Object.keys(out).length ? out : null;
}

function norm(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === "object" && "toNumber" in (v as object)) return (v as { toNumber(): number }).toNumber();
  return v ?? null;
}

export async function audit(
  adminId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  opts: { changes?: Plain | null; meta?: Plain } = {},
) {
  await prisma.auditLog.create({
    data: {
      adminId,
      action,
      entity,
      entityId,
      changes: (opts.changes ?? undefined) as object | undefined,
      meta: (opts.meta ?? undefined) as object | undefined,
      ip: await clientIp().catch(() => null),
    },
  });
}
