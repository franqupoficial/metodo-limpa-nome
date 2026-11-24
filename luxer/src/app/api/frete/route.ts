import { prisma } from "@/lib/db";
import { guardPublic } from "@/lib/http";
import { quoteShipping } from "@/lib/shipping";
import { getCartView } from "@/lib/cart";

/** Cotação de frete: de um produto (página do produto) ou do carrinho atual. Preço sempre calculado no servidor. */
export async function POST(req: Request) {
  const blocked = await guardPublic(req, "frete", 40, 600);
  if (blocked) return blocked;
  const b = (await req.json().catch(() => null)) as { cep?: string; productId?: string } | null;
  if (!b?.cep) return Response.json({ options: [], error: "Informe o CEP." }, { status: 400 });
  if (b.productId) {
    const p = await prisma.product.findUnique({ where: { id: b.productId } });
    if (!p) return Response.json({ options: [], error: "Produto não encontrado." }, { status: 404 });
    const r = await quoteShipping(b.cep, [{ quantity: 1, unitCents: p.priceCents, weightG: p.packageWeightG ?? (p.weightG ? Math.ceil(Number(p.weightG)) + 250 : null), lengthCm: p.packageLengthCm, widthCm: p.packageWidthCm, heightCm: p.packageHeightCm }], p.priceCents);
    return Response.json(r);
  }
  const cart = await getCartView();
  if (!cart.lines.length) return Response.json({ options: [], error: "Sacola vazia." });
  return Response.json(await quoteShipping(b.cep, cart.lines.map((l) => ({ quantity: l.quantity, unitCents: l.unitCents, ...l.shipping })), cart.subtotalCents - cart.discountCents));
}
