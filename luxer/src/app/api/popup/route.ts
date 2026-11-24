import { prisma } from "@/lib/db";
import { guardPublic } from "@/lib/http";

export async function POST(req: Request) {
  const blocked = await guardPublic(req, "popup", 30, 3600);
  if (blocked) return blocked;
  const b = (await req.json().catch(() => null)) as { id?: string; ev?: string } | null;
  if (b?.id && b.ev === "view") await prisma.popup.updateMany({ where: { id: b.id }, data: { views: { increment: 1 } } });
  return Response.json({ ok: true });
}
