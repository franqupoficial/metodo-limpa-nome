import "server-only";
import { prisma } from "./db";
import { BUILTIN_SEGMENTS, segmentWhere, type SegmentRules } from "./segments";

export async function resolveSegment(key?: string | null) {
  if (!key) return null;
  if (BUILTIN_SEGMENTS[key]) return { id: key, ...BUILTIN_SEGMENTS[key], where: segmentWhere(BUILTIN_SEGMENTS[key].rules) };
  const s = await prisma.customerSegment.findUnique({ where: { id: key } });
  if (!s) return null;
  return { id: s.id, name: s.name, description: s.description ?? "", rules: s.rules as SegmentRules, where: segmentWhere(s.rules as SegmentRules) };
}
