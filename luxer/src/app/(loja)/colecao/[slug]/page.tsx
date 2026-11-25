import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media-url";
import { CatalogView, PageTitle } from "@/components/site/CatalogView";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await prisma.collection.findFirst({ where: { slug: (await params).slug, active: true } });
  return c ? { title: c.seoTitle ?? c.name, description: c.seoDescription ?? c.description ?? undefined } : {};
}

export default async function CollectionPage({ params, searchParams }: P) {
  const c = await prisma.collection.findFirst({ where: { slug: (await params).slug, active: true }, include: { products: { orderBy: { position: "asc" }, select: { productId: true } } } });
  if (!c) notFound();
  const sp = await searchParams;
  const ids = c.products.map((p) => p.productId);
  return (
    <CatalogView base={`/colecao/${c.slug}`} sp={sp} params={{ collectionId: c.id }} facetWhere={{ id: { in: ids } }}
      header={c.image ? (
        <section className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-12 lg:pt-14"><div className="aspect-[4/5] overflow-hidden lg:order-2"><img src={mediaUrl(c.image)!} alt="" className="h-full w-full object-cover" /></div><div className="lg:pl-8"><div className="eyebrow text-stone">{c.headline ?? "Coleção"}</div><h1 className="display mt-4 text-[2.8rem] sm:text-[4.4rem]">{c.name}</h1>{c.description && <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink/65">{c.description}</p>}</div></section>
      ) : <PageTitle eyebrow={c.headline ?? "Coleção"} title={c.name} text={c.description} />} />
  );
}
