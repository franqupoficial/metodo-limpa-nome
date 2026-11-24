import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { mediaUrl } from "@/lib/media-url";
import { centsToInput } from "@/lib/action";
import { PageHeader, Card, Badge, Field } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { uploadImages, imageAction, videoAction, variantAction, duplicateProduct, deleteProduct } from "../../../_actions/products";

export const metadata = { title: "Editar produto" };
const GRID = "grid grid-cols-[6rem_10rem_8rem_7rem_4.5rem_4rem_4rem_3rem_auto] items-center gap-2";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin("products.view");
  const { id } = await params;
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } }, videos: { orderBy: { position: "asc" } }, variants: { orderBy: { position: "asc" } },
      categories: true, collections: true, relatedFrom: { orderBy: { position: "asc" }, include: { related: { select: { ref: true, sku: true } } } },
      _count: { select: { orderItems: true, reviews: true } },
    },
  });
  if (!p) notFound();
  const [categories, collections, history] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true, parentId: true, parent: { select: { name: true } } } }),
    prisma.collection.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.auditLog.findMany({ where: { entity: "Product", entityId: p.id }, orderBy: { createdAt: "desc" }, take: 10, include: { admin: { select: { name: true } } } }),
  ]);
  const sorted = categories.filter((c) => !c.parentId).flatMap((c) => [c, ...categories.filter((s) => s.parentId === c.id)]);
  const canEdit = admin.can("products.edit");

  return (
    <>
      <PageHeader
        title={p.name}
        back={{ href: "/admin/produtos", label: "Produtos" }}
        subtitle={<>Ref. {p.ref ?? "—"} · {p._count.orderItems} venda(s) registrada(s) · atualizado em {formatDate(p.updatedAt, true)}{p.sourceUrl && <> · <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="underline">página de origem</a></>}</>}
        actions={<>
          <Link href={`/produto/${p.slug}`} target="_blank" className="btn">Ver na loja</Link>
          {canEdit && <ActionButton action={duplicateProduct} fields={{ id: p.id }} label="Duplicar" />}
          {admin.can("products.delete") && <ActionButton action={deleteProduct} fields={{ id: p.id }} label="Excluir" className="btn btn-danger" confirm={p._count.orderItems ? "Este produto tem pedidos e será ARQUIVADO. Continuar?" : "Excluir definitivamente este produto?"} />}
        </>}
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card title={`Fotografias (${p.images.length})`}>
          {p.images.length === 0 && <p className="mb-3 text-sm text-amber-700">Produto sem fotografia: ele aparece na loja com um marcador neutro.</p>}
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {p.images.map((img, i) => (
              <li key={img.id} className="group relative">
                <img src={mediaUrl(img.thumbKey ?? img.key)!} alt={img.alt ?? ""} className="aspect-square w-full rounded-lg border border-zinc-200 bg-zinc-50 object-cover" />
                {i === 0 && <span className="absolute left-1 top-1"><Badge tone="gold">Principal</Badge></span>}
                {canEdit && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {i > 0 && <ActionButton action={imageAction} fields={{ imageId: img.id, op: "primary" }} label="★" className="btn !px-1.5 !py-0.5 text-[11px]" />}
                    {i > 0 && <ActionButton action={imageAction} fields={{ imageId: img.id, op: "up" }} label="←" className="btn !px-1.5 !py-0.5 text-[11px]" />}
                    {i < p.images.length - 1 && <ActionButton action={imageAction} fields={{ imageId: img.id, op: "down" }} label="→" className="btn !px-1.5 !py-0.5 text-[11px]" />}
                    <ActionButton action={imageAction} fields={{ imageId: img.id, op: "delete" }} label="✕" className="btn btn-danger !px-1.5 !py-0.5 text-[11px]" confirm="Remover esta foto?" />
                  </div>
                )}
              </li>
            ))}
          </ul>
          {canEdit && (
            <ActionForm action={uploadImages} className="mt-4 border-t border-zinc-100 pt-4" resetOnSuccess>
              <input type="hidden" name="productId" value={p.id} />
              <div className="flex flex-wrap items-center gap-2">
                <input type="file" name="files" accept="image/jpeg,image/png,image/webp,image/avif" multiple required className="text-sm" />
                <Submit pendingText="Enviando…">Enviar fotos</Submit>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">JPG, PNG, WebP ou AVIF até 12 MB. As fotos são otimizadas e os metadados (GPS/EXIF) removidos.</p>
            </ActionForm>
          )}
        </Card>

        <Card title="Vídeos">
          <ul className="space-y-2 text-sm">
            {p.videos.length === 0 && <li className="text-zinc-500">Nenhum vídeo.</li>}
            {p.videos.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2"><a href={v.url} target="_blank" rel="noreferrer" className="truncate text-sky-700 underline">{v.title || v.url}</a>{canEdit && <ActionButton action={videoAction} fields={{ productId: p.id, videoId: v.id, op: "delete" }} label="Remover" className="btn btn-danger !py-1 text-xs" />}</li>
            ))}
          </ul>
          {canEdit && (
            <ActionForm action={videoAction} className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4" resetOnSuccess>
              <input type="hidden" name="productId" value={p.id} /><input type="hidden" name="op" value="add" />
              <input name="url" placeholder="Link do YouTube ou .mp4" required className="input min-w-0 flex-1" />
              <input name="title" placeholder="Título (opcional)" className="input !w-40" />
              <Submit>Adicionar</Submit>
            </ActionForm>
          )}
        </Card>
      </div>

      <Card title={`Variações e estoque (${p.variants.length})`} className="mb-5" actions={<Link href={`/admin/estoque?q=${encodeURIComponent(p.ref ?? p.name)}`} className="text-xs font-semibold text-zinc-500 hover:underline">movimentar estoque →</Link>} pad={false}>
        {!p.trackStock && <p className="mx-4 mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Controle de estoque desativado: o produto é vendido conforme disponibilidade (como no site anterior). Faça o inventário em Estoque para ativar o controle por quantidade.</p>}
        <div className="overflow-x-auto">
          <div className="min-w-[860px] text-sm">
            <div className={`${GRID} border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500`}>
              <span>{p.optionName ?? "Opção"}</span><span>SKU</span><span>Cód. barras</span><span>Preço próprio</span><span>Mínimo</span><span className="text-right">Estoque</span><span className="text-right">Reserv.</span><span>Ativa</span><span />
            </div>
            {p.variants.map((v) => canEdit ? (
              <ActionForm key={v.id} action={variantAction} className={`${GRID} border-b border-zinc-50 px-3 py-2`}>
                <input type="hidden" name="productId" value={p.id} /><input type="hidden" name="variantId" value={v.id} /><input type="hidden" name="op" value="update" />
                <input name="option" defaultValue={v.option ?? ""} placeholder="única" className="input" />
                <input name="sku" defaultValue={v.sku} className="input font-mono text-xs" />
                <input name="barcode" defaultValue={v.barcode ?? ""} className="input" />
                <input name="price" defaultValue={centsToInput(v.priceCents)} placeholder={formatMoney(p.priceCents)} disabled={!admin.can("products.price")} className="input" />
                <input name="minStock" type="number" min={0} defaultValue={v.minStock} className="input" />
                <span className="text-right tabular-nums">{v.stock}</span>
                <span className="text-right tabular-nums text-zinc-500">{v.reserved}</span>
                <input type="checkbox" name="active" defaultChecked={v.active} aria-label="Ativa" />
                <Submit className="btn !py-1 text-xs">Salvar</Submit>
              </ActionForm>
            ) : (
              <div key={v.id} className={`${GRID} border-b border-zinc-50 px-3 py-2`}>
                <span>{v.option ?? "única"}</span><span className="font-mono text-xs">{v.sku}</span><span>{v.barcode ?? "—"}</span><span>{centsToInput(v.priceCents) || "—"}</span><span>{v.minStock}</span><span className="text-right">{v.stock}</span><span className="text-right">{v.reserved}</span><span>{v.active ? "Sim" : "Não"}</span><span />
              </div>
            ))}
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-end gap-3 border-t border-zinc-100 p-4">
            <ActionForm action={variantAction} className="flex flex-wrap items-end gap-2" resetOnSuccess>
              <input type="hidden" name="productId" value={p.id} /><input type="hidden" name="op" value="create" />
              <Field label="Adicionar opções"><input name="options" placeholder="ex.: 12, 13, 14, 15" required className="input !w-56" /></Field>
              {!p.optionName && <Field label="Nome da opção"><input name="optionName" defaultValue="Tamanho" className="input !w-32" /></Field>}
              <Submit>Adicionar</Submit>
            </ActionForm>
            {p.variants.length > 1 && (
              <div className="ml-auto flex flex-wrap gap-1 text-xs">
                {p.variants.map((v) => <ActionButton key={v.id} action={variantAction} fields={{ productId: p.id, variantId: v.id, op: "delete" }} label={`✕ ${v.option ?? v.sku}`} className="btn btn-danger !py-1 text-[11px]" confirm={`Excluir a variação ${v.option ?? v.sku}?`} />)}
              </div>
            )}
          </div>
        )}
      </Card>

      <ProductForm
        product={p}
        categories={sorted}
        collections={collections}
        selectedCats={p.categories.map((c) => c.categoryId)}
        selectedCols={p.collections.map((c) => c.collectionId)}
        related={p.relatedFrom.map((r) => r.related.ref ?? r.related.sku).filter(Boolean).join(", ")}
        can={{ price: admin.can("products.price"), publish: admin.can("products.publish") }}
      />

      <Card title="Histórico de alterações" className="mt-5" pad={false}>
        <table className="tbl"><tbody>
          {history.length === 0 && <tr><td className="text-zinc-500">Sem alterações registradas.</td></tr>}
          {history.map((h) => (
            <tr key={h.id}><td className="whitespace-nowrap text-xs text-zinc-500">{formatDate(h.createdAt, true)}</td><td className="text-xs">{h.admin?.name ?? "sistema"}</td><td className="text-xs font-mono">{h.action}</td>
              <td className="text-xs text-zinc-600">{h.changes ? Object.keys(h.changes as object).join(", ") : ""}</td></tr>
          ))}
        </tbody></table>
      </Card>
    </>
  );
}
