import Link from "next/link";
import type { NewsPost } from "@prisma/client";
import { formatDate } from "@/lib/format";
import { newsCategoryLabel } from "@/content/news-categories";

export function NewsCard({ post, compact = false }: { post: Pick<NewsPost, "slug" | "title" | "subtitle" | "category" | "publishedAt" | "imageUrl" | "imageAlt">; compact?: boolean }) {
  return (
    <article className="card-hover group relative flex h-full flex-col overflow-hidden">
      {!compact && (
        <div className="aspect-[16/9] overflow-hidden bg-brand-50">
          {post.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.imageUrl} alt={post.imageAlt ?? ""} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700">
              <span className="text-sm font-semibold">{newsCategoryLabel(post.category)}</span>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow">{newsCategoryLabel(post.category)}</p>
        <h3 className="mt-1.5 font-bold leading-snug">
          <Link href={`/noticias/${post.slug}`} className="text-ink no-underline after:absolute after:inset-0 group-hover:text-brand-700">{post.title}</Link>
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{post.subtitle}</p>
        <p className="mt-3 text-xs text-muted"><time dateTime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt)}</time></p>
      </div>
    </article>
  );
}
