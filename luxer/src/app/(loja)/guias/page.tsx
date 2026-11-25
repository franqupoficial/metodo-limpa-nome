import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media-url";
import { plainExcerpt } from "@/lib/markdown";
import { Container } from "@/components/site/Section";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Guias Luxer — significados, presentes e cuidados", description: "Guias da Luxer Joias sobre joias de fé, presentes e cuidados com o ouro 18k." };

/**
 * Central editorial. O conteúdo é escrito pela equipe no painel (Conteúdo → Páginas, tipo "Guia"):
 * nada é gerado aqui — sem guias publicados, a página diz isso e leva às coleções.
 */
export default async function GuidesPage() {
  const guides = await prisma.page.findMany({ where: { type: "GUIDE", published: true }, orderBy: [{ position: "asc" }, { publishedAt: "desc" }], select: { slug: true, title: true, content: true, heroImageKey: true, seoDescription: true } });
  return (
    <Container className="py-16 sm:py-24">
      <header className="mx-auto max-w-2xl text-center">
        <div className="eyebrow text-stone">Guias Luxer</div>
        <h1 className="display mt-5 text-[2.6rem] sm:text-[4rem]">Escolher com significado</h1>
        <p className="mt-6 text-[14.5px] leading-relaxed text-ink/60">Joias de fé, presentes e cuidados com o ouro 18k.</p>
      </header>
      {guides.length ? (
        <div className="mt-16 grid gap-x-8 gap-y-16 sm:mt-24 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => (
            <Link key={g.slug} href={`/p/${g.slug}`} className="group block">
              {g.heroImageKey && <div className="mb-6 aspect-[4/3] overflow-hidden bg-plate"><img src={mediaUrl(g.heroImageKey)!} alt="" loading="lazy" className="h-full w-full object-cover transition duration-[1200ms] group-hover:scale-[1.03]" /></div>}
              <h2 className="font-serif text-[1.7rem] leading-tight">{g.title}</h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink/60">{g.seoDescription ?? plainExcerpt(g.content, 170)}</p>
              <span className="link-line mt-5 text-ink">Ler o guia</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-16 max-w-md border-t border-line pt-10 text-center">
          <p className="text-[14px] leading-relaxed text-ink/60">Os primeiros guias estão sendo preparados pela nossa equipe.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-4"><Link href="/luxer-fe" className="link-line text-ink">Luxer Fé</Link><Link href="/busca" className="link-line text-ink">Todas as joias</Link></div>
        </div>
      )}
    </Container>
  );
}
