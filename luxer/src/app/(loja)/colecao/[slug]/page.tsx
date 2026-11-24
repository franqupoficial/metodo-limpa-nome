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
        <section className="relative h-[50svh] min-h-[360px] bg-ink"><img src={mediaUrl(c.image)!} alt="" className="h-full w-full object-cover opacity-80" /><div className="absolute inset-0 flex items-center justify-center bg-black/30 text-center text-ivory"><div><div className="eyebrow text-gold">{c.headline ?? "Coleção"}</div><h1 className="display mt-3 text-6xl">{c.name}</h1>{c.description && <p className="mx-auto mt-4 max-w-xl text-sm">{c.description}</p>}</div></div></section>
      ) : <PageTitle eyebrow={c.headline ?? "Coleção"} title={c.name} text={c.description} dark={c.faith} />} />
  );
}
