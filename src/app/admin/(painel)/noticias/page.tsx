import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { newsCategoryLabel } from "@/content/news-categories";
import { AdminHeader, Empty } from "@/components/admin/ui";
import { Notice } from "@/components/ui";

export const metadata = { title: "Notícias" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; excluida?: string }> }) {
  const { q = "", excluida } = await searchParams;
  const posts = await prisma.newsPost.findMany({
    where: q ? { title: { contains: q, mode: "insensitive" } } : {},
    orderBy: [{ publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    select: { id: true, slug: true, title: true, category: true, published: true, publishedAt: true, author: true, updatedAt: true },
  });
  const now = new Date();
  return (
    <>
      <AdminHeader title="Notícias e conteúdos" subtitle={`${posts.length} conteúdo(s)`} actions={<Link href="/admin/noticias/novo" className="btn-primary">+ Nova notícia</Link>} />
      {excluida && <div className="mb-4"><Notice tone="success">Notícia excluída.</Notice></div>}
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} className="input max-w-md" placeholder="Buscar por título" aria-label="Buscar" /><button className="btn-primary">Buscar</button></form>
      <div className="card overflow-x-auto">
        {posts.length ? (
          <table className="table-portal min-w-[700px]">
            <thead><tr><th>Título</th><th>Categoria</th><th>Autor</th><th>Publicação</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.title}</td>
                  <td className="text-xs">{newsCategoryLabel(p.category)}</td>
                  <td className="text-xs">{p.author}</td>
                  <td className="text-xs">{formatDate(p.publishedAt, true)}</td>
                  <td>{!p.published ? <span className="badge bg-slate-100 text-slate-700">Rascunho</span> : p.publishedAt && p.publishedAt > now ? <span className="badge bg-amber-100 text-amber-900">Agendada</span> : <span className="badge bg-emerald-100 text-emerald-800">Publicada</span>}</td>
                  <td className="whitespace-nowrap"><Link href={`/admin/noticias/${p.id}`} className="btn-secondary btn-sm">Editar</Link> {p.published && <Link href={`/noticias/${p.slug}`} target="_blank" className="btn-ghost btn-sm">Ver</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>Nenhuma notícia.</Empty>}
      </div>
    </>
  );
}
