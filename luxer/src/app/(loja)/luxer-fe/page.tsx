import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media-url";
import { CatalogView } from "@/components/site/CatalogView";
import { Container } from "@/components/site/Section";
import { faithDevotions, faithPieceTypes, faithTotal } from "@/lib/faith";

export const metadata: Metadata = { title: "Luxer Fé — Joias religiosas em ouro 18k", description: "Nossa Senhora, Divino Espírito Santo, crucifixos, escapulários, anjos, santos e pingentes religiosos em ouro 18k." };

export default async function FaithPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const now = new Date();
  const [devotions, types, total, cols, banner] = await Promise.all([
    faithDevotions(), faithPieceTypes(), faithTotal(),
    prisma.collection.findMany({ where: { faith: true, active: true }, orderBy: { position: "asc" } }),
    prisma.banner.findFirst({ where: { placement: "FAITH", active: true, imageKey: { not: null }, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] }, orderBy: { position: "asc" } }),
  ]);
  const shown = [...devotions, ...types];
  const current = sp.q ? `/luxer-fe?q=${encodeURIComponent(sp.q)}` : null;
  return (
    <CatalogView base="/luxer-fe" sp={sp} params={{ faith: true }} facetWhere={{ OR: [{ categories: { some: { category: { faith: true } } } }, { collections: { some: { collection: { faith: true } } } }] }}
      header={<>
        <section>
          <Container className={banner ? "grid items-center gap-10 pb-12 pt-10 lg:grid-cols-2 lg:gap-20 lg:pt-14" : "pb-10 pt-14 text-center sm:pb-12 sm:pt-20"}>
            {banner && <div className="aspect-[4/5] overflow-hidden lg:order-2"><img src={mediaUrl(banner.imageKey)!} alt="" className="h-full w-full object-cover" /></div>}
            <div className={banner ? "lg:pl-8" : ""}>
              <div className="eyebrow text-stone">Luxer Fé</div>
              <h1 className="display mt-4 text-[2.7rem] sm:text-[4.2rem]">{banner?.title ?? "Joias que carregam devoção"}</h1>
              <p className={`mt-5 max-w-xl text-[14px] leading-relaxed text-ink/60 ${banner ? "" : "mx-auto"}`}>{banner?.subtitle ?? `Nossa Senhora, Divino Espírito Santo, crucifixos, escapulários, anjos e santos — ${total} peças em ouro 18 quilates.`}</p>
            </div>
          </Container>
        </section>
        {(shown.length > 0 || cols.length > 0) && (
          <Container><div className="overflow-x-auto pb-8 [scrollbar-width:none]"><div className="mx-auto flex w-max gap-7 text-[10.5px] uppercase tracking-[0.22em]">
            {cols.map((c) => <Link key={c.id} href={`/colecao/${c.slug}`} className="whitespace-nowrap border-b border-gold pb-1.5 text-ink">{c.name}</Link>)}
            <Link href="/luxer-fe" className={`whitespace-nowrap border-b pb-1.5 transition-colors ${!current ? "border-ink text-ink" : "border-transparent text-ink/55 hover:text-ink"}`}>Todas</Link>
            {shown.map((c) => <Link key={c.href} href={c.href} className={`whitespace-nowrap border-b pb-1.5 transition-colors ${current === c.href ? "border-ink text-ink" : "border-transparent text-ink/55 hover:text-ink"}`}>{c.label}</Link>)}
          </div></div></Container>
        )}
      </>} />
  );
}
