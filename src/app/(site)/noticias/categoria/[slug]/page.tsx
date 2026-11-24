import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsList } from "@/components/NewsList";
import { isNewsCategory, newsCategoryLabel } from "@/content/news-categories";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${newsCategoryLabel(slug)} — Notícias e conteúdos`, alternates: { canonical: `/noticias/categoria/${slug}` } };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ pagina?: string }> }) {
  const { slug } = await params;
  if (!isNewsCategory(slug)) notFound();
  const { pagina } = await searchParams;
  return <NewsList category={slug} page={Number(pagina) || 1} />;
}
