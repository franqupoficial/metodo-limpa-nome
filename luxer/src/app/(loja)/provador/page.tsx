import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { providerConfigured } from "@/lib/ai/tryon";
import { tryOnCategoryFor } from "@/lib/ai/categories";
import { visibleWhere } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media-url";
import { Container } from "@/components/site/Section";
import { PageTitle } from "@/components/site/CatalogView";
import { TryOn } from "@/components/site/TryOn";

export const metadata = { title: "Provador virtual — LUXER AI TRY-ON", description: "Experimente colares, correntes, pingentes, brincos, pulseiras e anéis com inteligência artificial." };

export default async function TryOnPage({ searchParams }: { searchParams: Promise<{ produto?: string }> }) {
  const s = await getSettings();
  const { produto } = await searchParams;
  const available = s.ai.tryOnEnabled && providerConfigured(s.ai.provider);
  let products: { slug: string; name: string; image: string | null; category: string }[] = [];
  if (available) {
    const rows = await prisma.product.findMany({
      where: { AND: [visibleWhere(), { tryOnEnabled: true }, { images: { some: {} } }] },
      orderBy: [{ featured: "desc" }, { salesCount: "desc" }, { priceCents: "desc" }],
      select: { slug: true, name: true, jewelryType: true, images: { take: 1, orderBy: { position: "asc" }, select: { thumbKey: true } }, categories: { select: { category: { select: { name: true } } } } },
      take: 600,
    });
    products = rows.map((r) => ({ slug: r.slug, name: r.name, image: mediaUrl(r.images[0]?.thumbKey ?? null), category: tryOnCategoryFor(r.categories.map((c) => c.category.name).join(" ") + " " + (r.jewelryType ?? "") + " " + r.name) ?? "" })).filter((p) => p.category && s.ai.categories.includes(p.category));
  }
  return (
    <>
      <PageTitle dark eyebrow="LUXER AI TRY-ON" title="Provador virtual" text="Envie uma foto, escolha a joia e veja uma simulação realista gerada por inteligência artificial." />
      <Container className="py-14">
        {!available || !products.length ? <p className="mx-auto max-w-xl py-16 text-center text-stone">{s.ai.unavailableMessage}</p> : <TryOn products={products} initial={produto} consentText={s.ai.consentText} disclaimer={s.ai.disclaimer} />}
      </Container>
    </>
  );
}
