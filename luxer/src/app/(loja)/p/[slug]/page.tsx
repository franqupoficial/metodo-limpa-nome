import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Markdown, plainExcerpt } from "@/lib/markdown";
import { mediaUrl } from "@/lib/media-url";
import { getCurrentAdmin } from "@/lib/auth";
import { Container } from "@/components/site/Section";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await prisma.page.findUnique({ where: { slug: (await params).slug } });
  if (!p?.published) return { robots: { index: false } };
  return { title: p.seoTitle ?? p.title, description: p.seoDescription ?? plainExcerpt(p.content, 155) };
}

export default async function CmsPage({ params, searchParams }: P) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const p = await prisma.page.findUnique({ where: { slug } });
  if (!p) notFound();
  // pré-visualização do rascunho: token da página + sessão administrativa ativa
  const isPreview = Boolean(preview && p.previewToken === preview && (await getCurrentAdmin())?.can("content.manage"));
  if (!p.published && !isPreview) notFound();
  const title = isPreview ? p.draftTitle ?? p.title : p.title;
  const body = isPreview ? p.draft ?? p.content : p.content;
  return (
    <>
      {isPreview && <div className="sticky top-0 z-50 bg-amber-400 py-2 text-center text-xs font-semibold text-ink">PRÉ-VISUALIZAÇÃO DO RASCUNHO — não publicado</div>}
      <section className={p.heroImageKey ? "relative h-[40svh] min-h-[300px] bg-ink" : "bg-sand"}>
        {p.heroImageKey && <img src={mediaUrl(p.heroImageKey)!} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
        <Container className={`relative flex h-full items-end py-14 ${p.heroImageKey ? "text-ivory" : ""}`}><h1 className="display text-5xl sm:text-6xl">{title}</h1></Container>
      </section>
      <Container className="max-w-3xl py-14"><Markdown source={body} /></Container>
    </>
  );
}
