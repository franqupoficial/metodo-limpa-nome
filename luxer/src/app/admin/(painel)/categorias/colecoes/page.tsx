import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge, Field, Empty } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { saveCollection, deleteCollection } from "../../../_actions/catalog";

export const metadata = { title: "Coleções" };

export default async function Collections({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  await requireAdmin("categories.manage");
  const { editar } = await searchParams;
  const list = await prisma.collection.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  const edit = editar ? await prisma.collection.findUnique({ where: { id: editar }, include: { products: { orderBy: { position: "asc" }, include: { product: { select: { ref: true, sku: true } } } } } }) : null;
  return (
    <>
      <PageHeader title="Coleções" subtitle="Seleções curadas (ex.: Dia das Mães, Noivas, Luxer Fé — Nossa Senhora). Aparecem na homepage e em /colecao/…" />
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <Card pad={false}>
          {list.length === 0 ? <Empty title="Nenhuma coleção criada">Crie a primeira coleção ao lado.</Empty> : (
            <table className="tbl"><thead><tr><th>Coleção</th><th>Produtos</th><th>Status</th><th /></tr></thead><tbody>
              {list.map((c) => (
                <tr key={c.id}><td className="font-medium">{c.name} {c.faith && <Badge tone="gold">Luxer Fé</Badge>} {c.featured && <Badge tone="blue">Destaque</Badge>}<div className="text-[11px] text-zinc-400">/colecao/{c.slug}</div></td>
                  <td>{c._count.products}</td><td>{c.active ? <Badge tone="green">Ativa</Badge> : <Badge>Inativa</Badge>}</td>
                  <td className="text-right"><Link href={`/admin/categorias/colecoes?editar=${c.id}`} className="btn !py-1 text-xs">Editar</Link></td></tr>
              ))}
            </tbody></table>
          )}
        </Card>
        <Card title={edit ? `Editar: ${edit.name}` : "Nova coleção"} actions={edit && <Link href="/admin/categorias/colecoes" className="text-xs text-zinc-500">+ nova</Link>}>
          <ActionForm action={saveCollection} className="space-y-3" key={edit?.id ?? "new"}>
            {edit && <input type="hidden" name="id" value={edit.id} />}
            <Field label="Nome *"><input name="name" defaultValue={edit?.name} required className="input" /></Field>
            <Field label="Chamada"><input name="headline" defaultValue={edit?.headline ?? ""} className="input" /></Field>
            <Field label="URL (slug)"><input name="slug" defaultValue={edit?.slug} className="input" /></Field>
            <Field label="Descrição"><textarea name="description" defaultValue={edit?.description ?? ""} rows={3} className="input" /></Field>
            <Field label="Imagem de capa"><input type="file" name="image" accept="image/*" className="text-sm" /></Field>
            <Field label="Produtos (referências ou SKUs, na ordem de exibição)"><textarea name="products" defaultValue={edit?.products.map((p) => p.product.ref ?? p.product.sku).join(", ") ?? ""} rows={4} className="input font-mono text-xs" placeholder="25438, 20811, 21489" /></Field>
            <Field label="Ordem"><input name="position" type="number" defaultValue={edit?.position ?? 0} className="input" /></Field>
            <div className="space-y-1.5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={edit?.active ?? true} /> Ativa</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={edit?.featured ?? false} /> Destacar na homepage</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="faith" defaultChecked={edit?.faith ?? false} /> Coleção Luxer Fé</label>
            </div>
            <Field label="Título SEO"><input name="seoTitle" defaultValue={edit?.seoTitle ?? ""} className="input" /></Field>
            <Field label="Descrição SEO"><textarea name="seoDescription" defaultValue={edit?.seoDescription ?? ""} rows={2} className="input" /></Field>
            <Submit>Salvar coleção</Submit>
          </ActionForm>
          {edit && <div className="mt-3 border-t border-zinc-100 pt-3"><ActionButton action={deleteCollection} fields={{ id: edit.id }} label="Excluir coleção" className="btn btn-danger" confirm="Excluir esta coleção? Os produtos não são afetados." /></div>}
        </Card>
      </div>
    </>
  );
}
