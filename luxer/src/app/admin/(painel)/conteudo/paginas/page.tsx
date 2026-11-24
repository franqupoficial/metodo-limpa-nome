import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, Field } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { savePage, unpublishPage } from "../../../_actions/content";

export const metadata = { title: "Páginas" };
const TYPES: Record<string, string> = { INSTITUTIONAL: "Institucional", POLICY: "Política", LANDING: "Landing page", STORY: "História da marca" };

export default async function Pages({ searchParams }: { searchParams: Promise<{ editar?: string; nova?: string }> }) {
  await requireAdmin("content.manage");
  const { editar, nova } = await searchParams;
  const list = await prisma.page.findMany({ orderBy: [{ type: "asc" }, { position: "asc" }] });
  const p = editar ? list.find((x) => x.id === editar) : null;
  const showForm = Boolean(p || nova);
  return (
    <>
      <PageHeader title="Páginas" subtitle="Institucionais, políticas, história da marca e landing pages. Edite em rascunho, pré-visualize e publique." actions={<Link href="?nova=1" className="btn btn-primary">+ Nova página</Link>} />
      <div className={`grid gap-5 ${showForm ? "xl:grid-cols-[340px_1fr]" : ""}`}>
        <Card pad={false}><table className="tbl"><tbody>{list.map((x) => (
          <tr key={x.id} className={x.id === p?.id ? "bg-[#fbf7ef]" : ""}><td><Link href={`?editar=${x.id}`} className="font-medium hover:underline">{x.title}</Link><div className="text-[11px] text-zinc-500">/p/{x.slug} · {TYPES[x.type] ?? x.type}</div></td>
            <td className="text-right">{x.published ? <Badge tone="green">Publicada</Badge> : <Badge tone="amber">Rascunho</Badge>}{x.draft && x.published && <div className="mt-1"><Badge tone="blue">alterações pendentes</Badge></div>}</td></tr>
        ))}</tbody></table></Card>
        {showForm && (
          <Card title={p ? `Editar: ${p.title}` : "Nova página"} actions={p && <span className="flex gap-2">{p.previewToken && p.draft != null && <a target="_blank" href={`/p/${p.slug}?preview=${p.previewToken}`} className="btn !py-1 text-xs">Pré-visualizar rascunho</a>}{p.published && <a target="_blank" href={`/p/${p.slug}`} className="btn !py-1 text-xs">Ver publicada</a>}</span>}>
            <ActionForm action={savePage} className="space-y-3" key={p?.id ?? "new"}>
              {p && <input type="hidden" name="id" value={p.id} />}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Título *" className="sm:col-span-2"><input name="title" defaultValue={p?.draftTitle ?? p?.title} required className="input" /></Field>
                <Field label="Tipo"><select name="type" defaultValue={p?.type ?? "INSTITUTIONAL"} className="input">{Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                <Field label="URL"><input name="slug" defaultValue={p?.slug} className="input" /></Field>
                <Field label="Ordem"><input name="position" type="number" defaultValue={p?.position ?? 0} className="input" /></Field>
                <Field label="Imagem de capa"><input type="file" name="hero" accept="image/*" className="text-sm" /></Field>
              </div>
              <Field label="Conteúdo" hint="Markdown simples: ## Título, ### Subtítulo, **negrito**, *itálico*, - lista, 1. lista, > citação, [texto](/link). HTML não é aceito (segurança).">
                <textarea name="content" defaultValue={p?.draft ?? p?.content ?? ""} rows={18} className="input font-mono text-xs leading-relaxed" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Título SEO"><input name="seoTitle" defaultValue={p?.seoTitle ?? ""} className="input" /></Field>
                <Field label="Descrição SEO"><input name="seoDescription" defaultValue={p?.seoDescription ?? ""} className="input" /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showInFooter" defaultChecked={p?.showInFooter ?? true} /> Exibir link no rodapé</label>
              <div className="flex flex-wrap gap-2"><Submit name="intent" value="draft" className="btn">Salvar rascunho</Submit><Submit name="intent" value="publish" confirm="Publicar esta versão no site?">Publicar</Submit></div>
              {p && <p className="text-[11px] text-zinc-500">Atualizada em {formatDate(p.updatedAt, true)}{p.publishedAt ? ` · publicada em ${formatDate(p.publishedAt, true)}` : ""}</p>}
            </ActionForm>
            {p && <div className="mt-3 flex gap-2 border-t pt-3">{p.published && <ActionButton action={unpublishPage} fields={{ id: p.id, op: "unpublish" }} label="Retirar do ar" className="btn" confirm="Retirar a página do ar?" />}<ActionButton action={unpublishPage} fields={{ id: p.id, op: "delete" }} label="Excluir" className="btn btn-danger" confirm="Excluir definitivamente?" /></div>}
          </Card>
        )}
      </div>
    </>
  );
}
