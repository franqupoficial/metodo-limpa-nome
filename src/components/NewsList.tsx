import Link from "next/link";
import { prisma } from "@/lib/db";
import { NEWS_CATEGORIES, newsCategoryLabel } from "@/content/news-categories";
import { NewsCard } from "./NewsCard";
import { PageHero } from "./ui";

const PER_PAGE = 9;

export async function NewsList({ category, page }: { category?: string; page: number }) {
  const where = { published: true, publishedAt: { lte: new Date() }, ...(category ? { category } : {}) };
  const [posts, total] = await Promise.all([
    prisma.newsPost.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.newsPost.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const base = category ? `/noticias/categoria/${category}` : "/noticias";
  return (
    <>
      <PageHero eyebrow="Notícias e conteúdos" title={category ? newsCategoryLabel(category) : "Notícias e conteúdos"} subtitle="Orientações e informações sobre direitos, crédito, formalização e mobilidade." crumbs={category ? [{ href: "/noticias", label: "Notícias" }, { label: newsCategoryLabel(category) }] : [{ label: "Notícias" }]} />
      <div className="container-portal py-8">
        <nav aria-label="Categorias" className="-mx-4 overflow-x-auto px-4">
          <ul className="flex gap-2 pb-2">
            <li><Link href="/noticias" className={`badge whitespace-nowrap px-3 py-1.5 text-sm no-underline ${!category ? "bg-brand-700 text-white" : "border border-line bg-white text-ink hover:border-brand-300"}`}>Todas</Link></li>
            {NEWS_CATEGORIES.map((c) => (
              <li key={c.slug}><Link href={`/noticias/categoria/${c.slug}`} className={`badge whitespace-nowrap px-3 py-1.5 text-sm no-underline ${category === c.slug ? "bg-brand-700 text-white" : "border border-line bg-white text-ink hover:border-brand-300"}`}>{c.label}</Link></li>
            ))}
          </ul>
        </nav>
        {posts.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <NewsCard key={p.id} post={p} />)}</div>
        ) : (
          <p className="card mt-6 p-10 text-center text-muted">Nenhum conteúdo publicado nesta categoria ainda.</p>
        )}
        {pages > 1 && (
          <nav aria-label="Paginação" className="mt-8 flex justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={`${base}?pagina=${n}`} aria-current={n === page ? "page" : undefined} className={`flex h-9 w-9 items-center justify-center rounded-full text-sm no-underline ${n === page ? "bg-brand-700 text-white" : "border border-line text-ink hover:bg-surface"}`}>{n}</Link>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
