import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { geminiConfigured } from "@/lib/ai/tryon";
import { tryOnCategoryFor, REGION_OF } from "@/lib/ai/categories";
import { visibleWhere } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media-url";
import { Container } from "@/components/site/Section";
import { TryOnGallery } from "@/components/site/TryOnGallery";

export const metadata = { title: "LUXER AI — Provador virtual de joias", description: "Experimente anéis, brincos, colares e pulseiras com a sua foto, com inteligência artificial." };

const STEPS = [
  ["Enquadre", "A câmera guia a posição da mão, orelha, pescoço ou pulso. Também é possível usar uma foto da galeria."],
  ["Localizamos", "A LUXER AI identifica a região do corpo e o ponto exato onde a joia é usada."],
  ["Aplicamos a peça real", "A fotografia original da joia é a referência obrigatória: desenho, pedras, cor e acabamento."],
  ["Verificamos", "Uma inspeção automática compara o resultado com a peça. Se não for fiel, não entregamos."],
];

export default async function TryOnPage({ searchParams }: { searchParams: Promise<{ produto?: string }> }) {
  const s = await getSettings();
  const { produto } = await searchParams;
  const available = s.ai.tryOnEnabled && geminiConfigured();
  let products: { slug: string; name: string; image: string | null; category: string }[] = [];
  if (available) {
    const rows = await prisma.product.findMany({
      where: { AND: [visibleWhere(), { tryOnEnabled: true }, { images: { some: {} } }, ...(produto ? [{ slug: produto }] : [])] },
      orderBy: [{ featured: "desc" }, { salesCount: "desc" }, { priceCents: "desc" }],
      select: { slug: true, name: true, jewelryType: true, images: { take: 1, orderBy: { position: "asc" }, select: { thumbKey: true, key: true } }, categories: { select: { category: { select: { name: true } } } } },
      take: 800,
    });
    products = rows.map((r) => ({ slug: r.slug, name: r.name, image: mediaUrl(r.images[0]?.thumbKey ?? r.images[0]?.key ?? null), category: tryOnCategoryFor(r.categories.map((c) => c.category.name).join(" ") + " " + (r.jewelryType ?? "") + " " + r.name) ?? "" })).filter((p) => p.category && REGION_OF[p.category] && s.ai.categories.includes(p.category));
  }
  return (
    <>
      <Container className="pb-14 pt-14 text-center sm:pt-20">
        <div className="eyebrow text-gold-2">Luxer AI</div>
        <h1 className="display mt-4 text-[2.7rem] sm:text-[4.2rem]">Provador virtual</h1>
        <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-ink/60">Veja anéis, brincos, colares e pulseiras da Luxer em você, a partir da sua própria foto.</p>
      </Container>
      <Container className="border-t border-line py-14">
        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => <li key={t}><div className="text-[11px] tabular-nums tracking-[0.2em] text-gold">0{i + 1}</div><div className="mt-3 font-serif text-xl">{t}</div><p className="mt-2 text-[13px] leading-relaxed text-ink/60">{d}</p></li>)}
        </ol>
      </Container>
      <Container className="border-t border-line pb-24 pt-14">
        {!available ? <p className="mx-auto max-w-xl py-10 text-center text-[14px] text-ink/70">{s.ai.unavailableMessage}</p>
          : products.length ? <><h2 className="mb-8 text-center font-serif text-[1.6rem]">Escolha a peça</h2><TryOnGallery products={products} /></>
          : <p className="py-10 text-center text-[14px] text-ink/70">Nenhuma peça disponível para o provador no momento.</p>}
      </Container>
    </>
  );
}
