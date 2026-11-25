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
      <Container className="max-w-3xl pb-10 pt-14 text-center sm:pt-20">
        <div className="eyebrow text-stone">Luxer Joias</div>
        <h1 className="display mt-4 text-[2.6rem] sm:text-[4rem]">{title}</h1>
      </Container>
      {p.heroImageKey && <Container className="max-w-5xl"><img src={mediaUrl(p.heroImageKey)!} alt="" className="aspect-[16/9] w-full object-cover" /></Container>}
      <Container className="max-w-2xl pb-24 pt-12"><div className="mx-auto mb-12 h-px w-12 bg-gold" /><Markdown source={body} /></Container>
    </>
  );
}
