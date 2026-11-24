import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media-url";
import { PageHeader, Card, Badge, Field } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { saveCategory, deleteCategory } from "../../_actions/catalog";

export const metadata = { title: "Categorias" };

export default async function Categories({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  await requireAdmin("categories.manage");
  const { editar } = await searchParams;
  const all = await prisma.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  const roots = all.filter((c) => !c.parentId);
  const edit = editar ? all.find((c) => c.id === editar) : null;
  return (
    <>
      <PageHeader title="Categorias" subtitle="Categorias e subcategorias da loja. Marque “Luxer Fé” para exibir na área de joias religiosas." />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card pad={false}>
          <table className="tbl">
            <thead><tr><th>Categoria</th><th>Produtos</th><th>Menu</th><th>Ordem</th><th /></tr></thead>
            <tbody>
              {roots.flatMap((r) => [r, ...all.filter((c) => c.parentId === r.id)]).map((c) => (
                <tr key={c.id}>
                  <td className={c.parentId ? "pl-8" : "font-semibold"}>
                    <span className="flex items-center gap-2">{c.image && <img src={mediaUrl(c.image)!} alt="" className="h-7 w-7 rounded object-cover" />}{c.parentId ? "↳ " : ""}{c.name}
                      {!c.active && <Badge tone="gray">inativa</Badge>}{c.faith && <Badge tone="gold">Luxer Fé</Badge>}</span>
                    <span className="text-[11px] font-normal text-zinc-400">/categoria/{c.slug}</span>
                  </td>
                  <td className="tabular-nums">{c._count.products}</td>
                  <td>{c.showInMenu ? "Sim" : "Não"}</td>
                  <td className="tabular-nums">{c.position}</td>
                  <td className="text-right"><Link href={`/admin/categorias?editar=${c.id}`} className="btn !py-1 text-xs">Editar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title={edit ? `Editar: ${edit.name}` : "Nova categoria"} actions={edit && <Link href="/admin/categorias" className="text-xs text-zinc-500">+ nova</Link>}>
          <ActionForm action={saveCategory} className="space-y-3" key={edit?.id ?? "new"}>
            {edit && <input type="hidden" name="id" value={edit.id} />}
            <Field label="Nome *"><input name="name" defaultValue={edit?.name} required className="input" /></Field>
            <Field label="Categoria-mãe"><select name="parentId" defaultValue={edit?.parentId ?? ""} className="input"><option value="">— (principal)</option>{roots.filter((r) => r.id !== edit?.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
            <Field label="URL (slug)"><input name="slug" defaultValue={edit?.slug} className="input" /></Field>
            <Field label="Descrição"><textarea name="description" defaultValue={edit?.description ?? ""} rows={3} className="input" /></Field>
            <Field label="Imagem"><input type="file" name="image" accept="image/*" className="text-sm" /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Ordem"><input name="position" type="number" defaultValue={edit?.position ?? 0} className="input" /></Field></div>
            <div className="space-y-1.5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={edit?.active ?? true} /> Ativa</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="showInMenu" defaultChecked={edit?.showInMenu ?? true} /> Exibir no menu</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="faith" defaultChecked={edit?.faith ?? false} /> Faz parte da Luxer Fé</label>
            </div>
            <Field label="Título SEO"><input name="seoTitle" defaultValue={edit?.seoTitle ?? ""} className="input" /></Field>
            <Field label="Descrição SEO"><textarea name="seoDescription" defaultValue={edit?.seoDescription ?? ""} rows={2} className="input" /></Field>
            <div className="flex gap-2"><Submit>Salvar</Submit></div>
          </ActionForm>
          {edit && <div className="mt-3 border-t border-zinc-100 pt-3"><ActionButton action={deleteCategory} fields={{ id: edit.id }} label="Excluir categoria" className="btn btn-danger" confirm="Excluir esta categoria?" /></div>}
        </Card>
      </div>
    </>
  );
}
