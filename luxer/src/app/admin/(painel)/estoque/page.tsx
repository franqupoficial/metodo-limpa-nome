import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge, Pagination, Empty, qs } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/forms";
import { stockMovement } from "../../_actions/stock";

export const metadata = { title: "Estoque" };
const PER = 50;

export default async function Stock({ searchParams }: { searchParams: Promise<{ q?: string; filtro?: string; page?: string }> }) {
  const admin = await requireAdmin("stock.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  let idFilter: string[] | undefined;
  if (sp.filtro === "baixo") idFilter = (await prisma.$queryRaw<{ id: string }[]>`SELECT v."id" FROM "ProductVariant" v JOIN "Product" p ON p."id"=v."productId" WHERE v."active" AND p."trackStock" AND (v."stock"-v."reserved") <= v."minStock"`).map((r) => r.id);
  const where: Prisma.ProductVariantWhereInput = {
    AND: [
      q ? { OR: [{ sku: { contains: q, mode: "insensitive" } }, { product: { name: { contains: q, mode: "insensitive" } } }, { product: { ref: { contains: q } } }] } : {},
      idFilter ? { id: { in: idFilter } } : {},
      sp.filtro === "esgotado" ? { product: { trackStock: true }, stock: { lte: 0 } } : {},
      sp.filtro === "reservado" ? { reserved: { gt: 0 } } : {},
      sp.filtro === "controlado" ? { product: { trackStock: true } } : {},
      sp.filtro === "sob-demanda" ? { product: { trackStock: false } } : {},
      { product: { status: { not: "ARCHIVED" } } },
    ],
  };
  const [total, rows, sums] = await Promise.all([
    prisma.productVariant.count({ where }),
    prisma.productVariant.findMany({ where, orderBy: [{ product: { name: "asc" } }, { position: "asc" }], skip: (page - 1) * PER, take: PER, include: { product: { select: { id: true, name: true, ref: true, trackStock: true } } } }),
    prisma.productVariant.aggregate({ where: { product: { trackStock: true } }, _sum: { stock: true, reserved: true } }),
  ]);
  const can = admin.can("stock.adjust");
  const base = { q: sp.q, filtro: sp.filtro };
  return (
    <>
      <PageHeader title="Estoque" subtitle={`${sums._sum.stock ?? 0} unidade(s) em estoque controlado · ${sums._sum.reserved ?? 0} reservada(s) em pedidos aguardando pagamento`}
        actions={<><a href="/api/admin/estoque" className="btn">Exportar CSV</a><Link href="/admin/estoque/inventario" className="btn">Inventário / importar</Link></>} />
      <Card className="mb-4">
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Produto, referência ou SKU" className="input min-w-0 flex-1" />
          <select name="filtro" defaultValue={sp.filtro ?? ""} className="input !w-auto"><option value="">Todos</option><option value="baixo">Abaixo do mínimo</option><option value="esgotado">Esgotados</option><option value="reservado">Com reserva</option><option value="controlado">Com controle de estoque</option><option value="sob-demanda">Sem controle (sob demanda)</option></select>
          <button className="btn">Filtrar</button>
        </form>
      </Card>
      <Card pad={false}>
        {rows.length === 0 ? <Empty title="Nenhuma variação encontrada" /> : (
          <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>Produto / SKU</th><th className="text-right">Físico</th><th className="text-right">Reservado</th><th className="text-right">Disponível</th><th className="text-right">Mín.</th>{can && <th>Movimentar</th>}</tr></thead>
            <tbody>{rows.map((v) => {
              const avail = v.stock - v.reserved;
              return (
                <tr key={v.id}>
                  <td><Link href={`/admin/produtos/${v.product.id}`} className="line-clamp-1 font-medium hover:underline">{v.product.name}</Link>
                    <div className="text-[11px] text-zinc-500"><span className="font-mono">{v.sku}</span>{v.option ? ` · ${v.option}` : ""}{!v.product.trackStock && " · sob demanda"}{!v.active && " · inativa"}</div></td>
                  <td className="text-right tabular-nums">{v.stock}</td>
                  <td className="text-right tabular-nums text-zinc-500">{v.reserved}</td>
                  <td className="text-right">{v.product.trackStock ? <Badge tone={avail <= 0 ? "red" : avail <= v.minStock ? "amber" : "green"}>{avail}</Badge> : "—"}</td>
                  <td className="text-right tabular-nums">{v.minStock}</td>
                  {can && <td>
                    <ActionForm action={stockMovement} className="flex flex-wrap items-center gap-1" resetOnSuccess>
                      <input type="hidden" name="variantId" value={v.id} />
                      <select name="type" className="input !w-28 !py-1 text-xs" defaultValue="IN"><option value="IN">Entrada +</option><option value="OUT">Saída −</option><option value="INVENTORY">Contagem =</option><option value="ADJUST">Ajuste =</option></select>
                      <input name="quantity" type="number" min={0} required className="input !w-16 !py-1 text-xs" aria-label="Quantidade" />
                      <input name="reason" placeholder="Motivo / NF" className="input !w-32 !py-1 text-xs" />
                      <Submit className="btn !py-1 text-xs">OK</Submit>
                    </ActionForm>
                  </td>}
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
        <Pagination page={page} pages={Math.ceil(total / PER)} total={total} makeHref={(n) => `/admin/estoque${qs(base, { page: n })}`} />
      </Card>
      <p className="mt-3 text-xs text-zinc-500">Reservas são criadas quando um pedido é feito e baixadas automaticamente quando o pagamento é aprovado; pedidos cancelados ou expirados liberam a reserva.</p>
    </>
  );
}
