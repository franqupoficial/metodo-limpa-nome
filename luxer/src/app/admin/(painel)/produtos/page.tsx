import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { PageHeader, Card, Badge, Pagination, Empty, qs } from "@/components/admin/ui";
import { ActionForm, SelectAll, Submit } from "@/components/admin/forms";
import { bulkProducts } from "../../_actions/products";

export const metadata = { title: "Produtos" };
const PER = 40;
const STATUS: Record<string, [string, "green" | "amber" | "gray"]> = { ACTIVE: ["Publicado", "green"], DRAFT: ["Rascunho", "amber"], ARCHIVED: ["Arquivado", "gray"] };

type SP = { q?: string; status?: string; cat?: string; estoque?: string; ordem?: string; page?: string; tag?: string };

export default async function Products({ searchParams }: { searchParams: Promise<SP> }) {
  const admin = await requireAdmin("products.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const where: Prisma.ProductWhereInput = {
    AND: [
      q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { ref: { contains: q } }, { sku: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] } : {},
      sp.status ? { status: sp.status as "ACTIVE" } : { status: { not: "ARCHIVED" } },
      sp.cat ? { categories: { some: { categoryId: sp.cat } } } : {},
      sp.tag ? { tags: { has: sp.tag } } : {},
      sp.estoque === "esgotado" ? { trackStock: true, variants: { every: { stock: { lte: 0 } } } } : {},
      sp.estoque === "sob-demanda" ? { trackStock: false } : {},
      sp.estoque === "sem-foto" ? { images: { none: {} } } : {},
      sp.estoque === "destaque" ? { featured: true } : {},
    ],
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sp.ordem === "preco" ? { priceCents: "desc" } : sp.ordem === "vendas" ? { salesCount: "desc" } : sp.ordem === "nome" ? { name: "asc" } : { updatedAt: "desc" };
  const [total, rows, cats] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where, orderBy, skip: (page - 1) * PER, take: PER,
      select: { id: true, name: true, ref: true, status: true, priceCents: true, compareAtCents: true, featured: true, trackStock: true, salesCount: true, publishAt: true,
        images: { take: 1, orderBy: { position: "asc" }, select: { thumbKey: true, key: true } },
        variants: { select: { stock: true, reserved: true, active: true } }, primaryCategory: { select: { name: true } } },
    }),
    prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { name: "asc" }], select: { id: true, name: true, parent: { select: { name: true } } } }),
  ]);
  const base = { q: sp.q, status: sp.status, cat: sp.cat, estoque: sp.estoque, ordem: sp.ordem, tag: sp.tag };

  return (
    <>
      <PageHeader title="Produtos" subtitle={`${total} produto(s)`} actions={admin.can("products.edit") && <Link href="/admin/produtos/novo" className="btn btn-primary">+ Novo produto</Link>} />
      <Card className="mb-4">
        <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <input name="q" defaultValue={sp.q} placeholder="Nome, referência ou SKU" className="input lg:col-span-2" />
          <select name="status" defaultValue={sp.status ?? ""} className="input"><option value="">Ativos e rascunhos</option><option value="ACTIVE">Publicados</option><option value="DRAFT">Rascunhos</option><option value="ARCHIVED">Arquivados</option></select>
          <select name="cat" defaultValue={sp.cat ?? ""} className="input"><option value="">Todas as categorias</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} › ` : ""}{c.name}</option>)}</select>
          <select name="estoque" defaultValue={sp.estoque ?? ""} className="input"><option value="">Todos</option><option value="esgotado">Esgotados</option><option value="sob-demanda">Sem controle de estoque</option><option value="sem-foto">Sem fotografia</option><option value="destaque">Em destaque</option></select>
          <div className="flex gap-2"><select name="ordem" defaultValue={sp.ordem ?? ""} className="input"><option value="">Recentes</option><option value="nome">Nome</option><option value="preco">Maior preço</option><option value="vendas">Mais vendidos</option></select><button className="btn">Filtrar</button></div>
        </form>
      </Card>

      {(admin.can("products.edit") || admin.can("products.publish")) && (
        <ActionForm action={bulkProducts} id="bulk" className="mb-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs font-semibold text-zinc-500">Ações em lote:</span>
            <select name="op" className="input !w-auto" required defaultValue="">
              <option value="" disabled>Escolha…</option>
              <option value="publish">Publicar</option><option value="unpublish">Despublicar (rascunho)</option><option value="archive">Arquivar</option>
              <option value="feature">Marcar destaque</option><option value="unfeature">Remover destaque</option><option value="bestseller">Marcar mais vendido</option><option value="new">Marcar novidade</option>
              <option value="category">Adicionar à categoria</option><option value="tag">Adicionar etiqueta</option><option value="price">Reajustar preço (%)</option>
              {admin.can("products.delete") && <option value="delete">Excluir (arquiva se houver pedidos)</option>}
            </select>
            <select name="categoryId" className="input !w-auto" defaultValue=""><option value="">(categoria)</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} › ` : ""}{c.name}</option>)}</select>
            <input name="tag" placeholder="(etiqueta)" className="input !w-28" />
            <input name="pct" placeholder="(% ex.: 5 ou -10)" className="input !w-36" />
            <Submit className="btn btn-primary" confirm="Aplicar a ação aos produtos selecionados?">Aplicar</Submit>
          </div>
        </ActionForm>
      )}

      <Card pad={false}>
        {rows.length === 0 ? <Empty title="Nenhum produto encontrado" /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th className="w-8"><SelectAll form="bulk" /></th><th>Produto</th><th>Categoria</th><th>Status</th><th className="text-right">Preço</th><th className="text-right">Estoque</th><th className="text-right">Vendas</th></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const stock = p.variants.reduce((a, v) => a + Math.max(0, v.stock - v.reserved), 0);
                  const img = mediaUrl(p.images[0]?.thumbKey ?? p.images[0]?.key);
                  return (
                    <tr key={p.id}>
                      <td><input type="checkbox" name="ids" value={p.id} form="bulk" aria-label={`Selecionar ${p.name}`} /></td>
                      <td>
                        <Link href={`/admin/produtos/${p.id}`} className="flex items-center gap-3">
                          {img ? <img src={img} alt="" className="h-11 w-11 rounded-md bg-zinc-100 object-cover" loading="lazy" /> : <span className="flex h-11 w-11 items-center justify-center rounded-md bg-zinc-100 text-[9px] text-zinc-400">sem foto</span>}
                          <span><span className="line-clamp-1 font-medium text-zinc-900 hover:underline">{p.name}</span><span className="text-[11px] text-zinc-500">Ref. {p.ref ?? "—"}{p.featured ? " · ★ destaque" : ""}</span></span>
                        </Link>
                      </td>
                      <td className="text-xs text-zinc-600">{p.primaryCategory?.name ?? "—"}</td>
                      <td><Badge tone={STATUS[p.status][1]}>{p.publishAt && p.publishAt > new Date() && p.status === "ACTIVE" ? "Agendado" : STATUS[p.status][0]}</Badge></td>
                      <td className="text-right tabular-nums">{formatMoney(p.priceCents)}{p.compareAtCents && <div className="text-[11px] text-zinc-400 line-through">{formatMoney(p.compareAtCents)}</div>}</td>
                      <td className="text-right">{p.trackStock ? <Badge tone={stock <= 0 ? "red" : "slate"}>{stock}</Badge> : <span className="text-[11px] text-zinc-500">sob demanda</span>}</td>
                      <td className="text-right tabular-nums">{p.salesCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={Math.ceil(total / PER)} total={total} makeHref={(n) => `/admin/produtos${qs(base, { page: n })}`} />
      </Card>
    </>
  );
}
