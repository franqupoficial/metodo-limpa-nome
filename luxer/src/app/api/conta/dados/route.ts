import { getCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { decryptJson, decryptString } from "@/lib/crypto";

/** LGPD — portabilidade: o titular baixa seus dados em JSON. */
export async function GET() {
  const c = await getCustomer();
  if (!c) return new Response("Não autenticado", { status: 401 });
  const [addresses, orders, favorites, reviews] = await Promise.all([
    prisma.customerAddress.findMany({ where: { customerId: c.id } }),
    prisma.order.findMany({ where: { OR: [{ customerId: c.id }, { email: c.email }] }, include: { items: true } }),
    prisma.favorite.findMany({ where: { customerId: c.id }, include: { product: { select: { name: true } } } }),
    prisma.review.findMany({ where: { customerId: c.id } }),
  ]);
  const data = {
    geradoEm: new Date().toISOString(),
    cadastro: { nome: c.name, email: c.email, telefone: c.phone, cpf: c.cpfEnc ? decryptString(c.cpfEnc) : null, aceitaMarketing: c.marketingOptIn, consentimentoEm: c.marketingOptAt, criadoEm: c.createdAt },
    enderecos: addresses.map(({ id: _i, customerId: _c, ...a }) => a),
    pedidos: orders.map((o) => ({ numero: o.number, data: o.createdAt, status: o.status, total: o.totalCents / 100, endereco: o.addressEnc ? decryptJson(o.addressEnc) : null, itens: o.items.map((i) => ({ produto: i.name, opcao: i.option, quantidade: i.quantity, valor: i.totalCents / 100 })) })),
    favoritos: favorites.map((f) => f.product.name),
    avaliacoes: reviews.map((r) => ({ nota: r.rating, texto: r.body, data: r.createdAt })),
  };
  return new Response(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="meus-dados-luxer.json"', "Cache-Control": "no-store" } });
}
