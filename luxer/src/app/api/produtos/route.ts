import { prisma } from "@/lib/db";
import { cardSelect, toCards, visibleWhere } from "@/lib/catalog";
import { getCustomer } from "@/lib/customer-auth";

/** Cartões de produto por IDs (favoritos e comparação). Com ?favoritos=1 devolve os favoritos da conta. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  let ids = (u.searchParams.get("ids") ?? "").split(",").filter((x) => /^[a-z0-9]{20,30}$/.test(x)).slice(0, 60);
  if (u.searchParams.get("favoritos")) {
    const c = await getCustomer();
    if (c) ids = [...new Set([...ids, ...(await prisma.favorite.findMany({ where: { customerId: c.id }, orderBy: { createdAt: "desc" }, select: { productId: true } })).map((f) => f.productId)])];
  }
  if (!ids.length) return Response.json({ items: [] });
  const rows = await prisma.product.findMany({ where: { AND: [visibleWhere(), { id: { in: ids } }] }, select: { ...cardSelect, specs: true, material: true, color: true, weightG: true, stoneType: true, karat: true } });
  const cards = await toCards(rows);
  const extra = Object.fromEntries(rows.map((r) => [r.id, { specs: r.specs, material: r.material, color: r.color, weightG: r.weightG ? Number(r.weightG) : null, stoneType: r.stoneType, karat: r.karat }]));
  return Response.json({ items: ids.map((id) => cards.find((c) => c.id === id)).filter(Boolean).map((c) => ({ ...c!, ...extra[c!.id] })) });
}
