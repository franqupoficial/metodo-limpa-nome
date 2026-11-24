import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media-url";
import { CatalogView } from "@/components/site/CatalogView";
import { Container } from "@/components/site/Section";

export const metadata: Metadata = { title: "Luxer Fé — Joias religiosas em ouro 18k", description: "Nossa Senhora, Divino Espírito Santo, crucifixos, medalhas, escapulários e pingentes religiosos em ouro 18k." };

export default async function FaithPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const now = new Date();
  const [cats, cols, banner] = await Promise.all([
    prisma.category.findMany({ where: { faith: true, active: true }, orderBy: [{ position: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }),
    prisma.collection.findMany({ where: { faith: true, active: true }, orderBy: { position: "asc" } }),
    prisma.banner.findFirst({ where: { placement: "FAITH", active: true, imageKey: { not: null }, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] }, orderBy: { position: "asc" } }),
  ]);
  const shown = cats.filter((c) => c._count.products > 0 && c.parentId);
  return (
    <CatalogView base="/luxer-fe" sp={sp} params={{ faith: true }} facetWhere={{ OR: [{ categories: { some: { category: { faith: true } } } }, { collections: { some: { collection: { faith: true } } } }] }}
      header={<>
        <section className="relative overflow-hidden bg-ink text-ivory">
          {banner && <img src={mediaUrl(banner.imageKey)!} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
          <Container className="relative py-20 text-center sm:py-28">
            <div className="eyebrow text-gold">Luxer Fé</div>
            <h1 className="display mt-4 text-5xl sm:text-7xl">{banner?.title ?? "Joias que carregam devoção"}</h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ivory/70">{banner?.subtitle ?? "Nossa Senhora, Divino Espírito Santo, crucifixos, medalhas, escapulários e pingentes religiosos — em ouro 18 quilates."}</p>
          </Container>
        </section>
        {(shown.length > 0 || cols.length > 0) && (
          <div className="border-b border-line bg-ivory"><Container><div className="flex gap-3 overflow-x-auto py-5 [scrollbar-width:none]">
            {cols.map((c) => <Link key={c.id} href={`/colecao/${c.slug}`} className="whitespace-nowrap border border-gold px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-gold-2 hover:bg-gold hover:text-ink">{c.name}</Link>)}
            {shown.map((c) => <Link key={c.id} href={`/categoria/${c.slug}`} className="whitespace-nowrap border border-line px-4 py-2 text-[11px] uppercase tracking-[0.2em] hover:border-gold hover:text-gold-2">{c.name}</Link>)}
          </div></Container></div>
        )}
      </>} />
  );
}
