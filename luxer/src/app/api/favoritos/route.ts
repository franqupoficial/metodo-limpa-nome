import { prisma } from "@/lib/db";
import { getCustomer } from "@/lib/customer-auth";
import { guardPublic } from "@/lib/http";

export async function POST(req: Request) {
  const blocked = await guardPublic(req, "fav", 120, 600);
  if (blocked) return blocked;
  const c = await getCustomer();
  if (!c) return Response.json({ ok: true, stored: "local" });
  const b = (await req.json().catch(() => null)) as { productId?: string; on?: boolean; sync?: string[] } | null;
  if (b?.sync?.length) {
    const ids = (await prisma.product.findMany({ where: { id: { in: b.sync.slice(0, 200) } }, select: { id: true } })).map((p) => p.id);
    await prisma.favorite.createMany({ data: ids.map((productId) => ({ customerId: c.id, productId })), skipDuplicates: true });
  } else if (b?.productId) {
    if (b.on) await prisma.favorite.createMany({ data: [{ customerId: c.id, productId: b.productId }], skipDuplicates: true });
    else await prisma.favorite.deleteMany({ where: { customerId: c.id, productId: b.productId } });
  }
  return Response.json({ ok: true, stored: "account" });
}
