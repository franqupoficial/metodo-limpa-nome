import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Markdown } from "@/lib/markdown";
import { formatLongDate } from "@/lib/format";
import { appUrl } from "@/lib/mail";
import { newsCategoryLabel } from "@/content/news-categories";
import { Breadcrumbs } from "@/components/ui";
import { NewsCard } from "@/components/NewsCard";
import { ShareButtons } from "@/components/ShareButtons";

export const revalidate = 300;

async function load(slug: string) {
  return prisma.newsPost.findFirst({ where: { slug, published: true, publishedAt: { lte: new Date() } } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Conteúdo não encontrado" };
  const title = p.seoTitle || p.title;
  const description = p.seoDescription || p.subtitle;
  return {
    title, description,
    alternates: { canonical: `/noticias/${p.slug}` },
    openGraph: { type: "article", title, description, publishedTime: p.publishedAt?.toISOString(), modifiedTime: p.updatedAt.toISOString(), authors: [p.author], images: p.imageUrl ? [{ url: p.imageUrl, alt: p.imageAlt ?? "" }] : undefined },
  };
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const related = await prisma.newsPost.findMany({
    where: { published: true, publishedAt: { lte: new Date() }, id: { not: p.id }, OR: [{ slug: { in: p.related } }, { category: p.category }] },
    orderBy: { publishedAt: "desc" }, take: 3,
  });
  const url = `${appUrl()}/noticias/${p.slug}`;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.subtitle,
    datePublished: p.publishedAt?.toISOString(), dateModified: p.updatedAt.toISOString(),
    author: { "@type": "Person", name: p.author }, publisher: { "@type": "Organization", name: "Portal Consumidor" },
    mainEntityOfPage: url, image: p.imageUrl ?? undefined,
  };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="border-b border-line bg-gradient-to-b from-brand-50 to-white">
        <div className="container-portal max-w-3xl py-8 sm:py-12">
          <Breadcrumbs items={[{ href: "/noticias", label: "Notícias" }, { href: `/noticias/categoria/${p.category}`, label: newsCategoryLabel(p.category) }]} />
          <Link href={`/noticias/categoria/${p.category}`} className="eyebrow mt-6 inline-block no-underline">{newsCategoryLabel(p.category)}</Link>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{p.title}</h1>
          <p className="mt-3 text-lg text-muted">{p.subtitle}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>Por <strong className="text-ink">{p.author}</strong> · <time dateTime={p.publishedAt?.toISOString()}>{p.publishedAt && formatLongDate(p.publishedAt)}</time>
              {p.updatedAt.getTime() - (p.publishedAt?.getTime() ?? 0) > 86_400_000 && <> · atualizado em {formatLongDate(p.updatedAt)}</>}</p>
            <ShareButtons url={url} title={p.title} />
          </div>
        </div>
      </header>
      <div className="container-portal max-w-3xl py-8">
        {p.imageUrl && (
          <figure className="mb-8 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imageUrl} alt={p.imageAlt ?? ""} className="w-full" />
          </figure>
        )}
        <Markdown source={p.content} />
        <p className="mt-10 border-t border-line pt-4 text-xs text-muted">Conteúdo informativo produzido pela equipe editorial do Portal Consumidor. Não substitui orientação jurídica individual.</p>
      </div>
      {related.length > 0 && (
        <section className="bg-surface py-10">
          <div className="container-portal">
            <h2 className="mb-5 text-xl font-bold">Conteúdos relacionados</h2>
            <div className="grid gap-5 md:grid-cols-3">{related.map((r) => <NewsCard key={r.id} post={r} compact />)}</div>
          </div>
        </section>
      )}
    </article>
  );
}
