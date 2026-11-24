import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { priceView } from "@/lib/pricing";
import { cardSelect, toCards, visibleWhere } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media-url";
import { Markdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { getCustomer } from "@/lib/customer-auth";
import { appUrl } from "@/lib/mail";
import { providerConfigured } from "@/lib/ai/tryon";
import { ProductGallery } from "@/components/site/ProductGallery";
import { BuyBox } from "@/components/site/BuyBox";
import { ShippingCalc } from "@/components/site/ShippingCalc";
import { FavoriteButton } from "@/components/site/FavoriteButton";
import { CompareButton } from "@/components/site/Compare";
import { ProductGrid } from "@/components/site/ProductCard";
import { Container, SectionHead } from "@/components/site/Section";
import { ReviewForm, ReportForm } from "@/components/site/ReviewForms";
import { tryOnCategoryFor } from "@/lib/ai/categories";

type P = { params: Promise<{ slug: string }> };

const load = (slug: string) =>
  prisma.product.findFirst({
    where: { AND: [{ slug }, visibleWhere()] },
    include: {
      images: { orderBy: { position: "asc" } }, videos: { orderBy: { position: "asc" } }, variants: { where: { active: true }, orderBy: { position: "asc" } },
      categories: { include: { category: { select: { id: true, name: true, slug: true, parentId: true, faith: true } } } }, primaryCategory: { include: { parent: true } },
      relatedFrom: { orderBy: { position: "asc" }, select: { relatedId: true } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Produto não encontrado" };
  const img = mediaUrl(p.images[0]?.key);
  return {
    title: p.seoTitle ?? p.name,
    description: p.seoDescription ?? (p.description ?? p.name).slice(0, 160),
    alternates: { canonical: `/produto/${p.slug}` },
    openGraph: { title: p.name, images: img ? [img] : undefined, type: "website" },
  };
}

export default async function ProductPage({ params }: P) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const [s, customer, sizeGuide] = await Promise.all([getSettings(), getCustomer(), prisma.page.count({ where: { slug: "guia-de-tamanhos", published: true } })]);
  const price = priceView(p, s.payment);
  const variants = p.variants.map((v) => ({ id: v.id, option: v.option, priceCents: v.priceCents, available: !p.trackStock || s.stock.allowBackorder ? 99 : Math.max(0, v.stock - v.reserved) }));
  const inStock = variants.some((v) => v.available > 0);
  const relatedIds = p.relatedFrom.map((r) => r.relatedId);
  const catIds = p.categories.filter((c) => c.category.parentId).map((c) => c.category.id);
  const related = await toCards(
    relatedIds.length
      ? await prisma.product.findMany({ where: { AND: [visibleWhere(), { id: { in: relatedIds } }] }, select: cardSelect })
      : await prisma.product.findMany({ where: { AND: [visibleWhere(), { id: { not: p.id } }, { images: { some: {} } }, { categories: { some: { categoryId: { in: catIds.length ? catIds : p.categories.map((c) => c.category.id) } } } }] }, orderBy: [{ salesCount: "desc" }, { priceCents: "desc" }], take: 4, select: cardSelect }),
  );
  const specs = (Array.isArray(p.specs) ? (p.specs as { label: string; value: string }[]) : []).filter((x) => x.value);
  const extra = (Array.isArray(p.customFields) ? (p.customFields as { label: string; value: string }[]) : []).filter((x) => x.value);
  const ficha: [string, string | null | undefined][] = [["Referência", p.ref], ["Material", p.material], ["Quilatagem", p.karat], ["Tipo de ouro", p.goldType], ["Acabamento", p.finish], ["Pedras", p.stoneType], ["Quantidade de pedras", p.stoneCount?.toString()], ["Peso médio", p.weightG ? `${Number(p.weightG).toLocaleString("pt-BR")} g` : null], ["Gênero", p.gender]];
  const shownLabels = new Set(specs.map((x) => x.label.toLowerCase()));
  const crumbs = p.primaryCategory ? [...(p.primaryCategory.parent ? [p.primaryCategory.parent] : []), p.primaryCategory] : [];
  const tryCat = tryOnCategoryFor(p.categories.map((c) => c.category.name).join(" ") + " " + (p.jewelryType ?? "") + " " + p.name);
  const canTry = s.ai.tryOnEnabled && providerConfigured(s.ai.provider) && p.tryOnEnabled && tryCat && s.ai.categories.includes(tryCat);
  const youtube = p.videos.map((v) => v.url.match(/[?&]v=([\w-]+)/)?.[1]).filter(Boolean) as string[];
  const files = p.videos.filter((v) => /\.(mp4|webm)/i.test(v.url));
  const rating = p.ratingCount ? Number(p.ratingAvg) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku ?? p.ref ?? undefined,
    mpn: p.ref ?? undefined,
    brand: { "@type": "Brand", name: s.store.name },
    image: p.images.map((i) => appUrl() + mediaUrl(i.key)),
    description: p.description ?? p.name,
    material: p.material ?? undefined,
    offers: { "@type": "Offer", url: `${appUrl()}/produto/${p.slug}`, priceCurrency: "BRL", price: (price.price / 100).toFixed(2), availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", itemCondition: "https://schema.org/NewCondition" },
    ...(rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: p.ratingCount } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Container className="py-6">
        <nav className="text-[11px] uppercase tracking-[0.18em] text-stone" aria-label="Trilha">
          <Link href="/" className="hover:text-gold-2">Início</Link>{crumbs.map((c) => <span key={c.id}> / <Link href={`/categoria/${c.slug}`} className="hover:text-gold-2">{c.name}</Link></span>)}
        </nav>
      </Container>
      <Container className="pb-20">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <ProductGallery name={p.name} videos={p.videos.map((v) => v.url)} images={p.images.map((i) => ({ src: mediaUrl(i.key)!, thumb: mediaUrl(i.thumbKey ?? i.key)!, alt: i.alt ?? p.name }))} />
          </div>
          <div className="lg:sticky lg:top-36 lg:self-start">
            <div className="flex items-start justify-between gap-4">
              <div>
                {p.ref && <div className="eyebrow text-stone">Ref. {p.ref}</div>}
                <h1 className="display mt-2 text-3xl sm:text-[2.6rem]">{p.name}</h1>
                {rating && <a href="#avaliacoes" className="mt-2 inline-flex items-center gap-2 text-sm"><span className="text-gold">{"★".repeat(Math.round(rating))}</span><span className="text-stone">{rating.toFixed(1).replace(".", ",")} ({p.ratingCount})</span></a>}
              </div>
              <div className="flex gap-2"><FavoriteButton productId={p.id} large /><CompareButton productId={p.id} /></div>
            </div>
            <div className="gold-rule my-6" />
            <BuyBox product={{ id: p.id, name: p.name, ref: p.ref, slug: p.slug }} variants={variants} optionName={p.optionName} whatsapp={s.contact.whatsapp} sizeGuide={sizeGuide > 0}
              price={{ price: price.price, compareAt: price.compareAt, pix: price.pix, installments: price.installments, installmentValue: price.installmentValue, pixPct: s.payment.pixDiscountBps / 100 }} />
            {canTry && <Link href={`/provador?produto=${p.slug}`} className="mt-3 flex items-center justify-center gap-2 border border-gold/60 bg-ink py-3.5 text-[11px] uppercase tracking-[0.24em] text-gold-soft hover:bg-ink-2">✦ Experimentar com Luxer AI</Link>}
            <div className="mt-8 border-t border-line pt-6"><div className="eyebrow mb-3 text-stone">Calcular frete e prazo</div><ShippingCalc productId={p.id} /></div>
            <ul className="mt-8 grid grid-cols-3 gap-3 border-t border-line pt-6 text-center text-[11px] leading-snug text-stone">
              <li>Ouro 18k<br />certificado</li><li>Nota fiscal<br />e garantia</li><li>Compra<br />segura</li>
            </ul>
          </div>
        </div>

        <div className="mt-20 grid gap-12 lg:grid-cols-2">
          <section>
            <h2 className="display text-3xl">Sobre a peça</h2>
            <div className="gold-rule my-5 w-16" />
            {p.description ? <Markdown source={p.description} /> : <p className="text-stone">Consulte nossa equipe para mais detalhes desta peça.</p>}
            {s.policies.warrantyText && <p className="mt-5 text-sm text-stone">{s.policies.warrantyText}</p>}
          </section>
          <section>
            <h2 className="display text-3xl">Especificações</h2>
            <div className="gold-rule my-5 w-16" />
            <dl className="divide-y divide-line text-sm">
              {ficha.filter(([l, v]) => v && !shownLabels.has(l.toLowerCase())).map(([l, v]) => <div key={l} className="flex justify-between gap-6 py-3"><dt className="text-stone">{l}</dt><dd className="text-right">{v}</dd></div>)}
              {[...specs, ...extra].map((x) => <div key={x.label} className="flex justify-between gap-6 py-3"><dt className="text-stone">{x.label}</dt><dd className="text-right">{x.value}</dd></div>)}
            </dl>
            <p className="mt-3 text-[11px] text-stone">Peso e medidas são médios e podem variar levemente por se tratar de peça em ouro.</p>
          </section>
        </div>

        {(youtube.length > 0 || files.length > 0) && (
          <section className="mt-20"><h2 className="display mb-6 text-3xl">Vídeos</h2><div className="grid gap-5 md:grid-cols-2">
            {youtube.map((id) => <iframe key={id} className="aspect-video w-full" src={`https://www.youtube-nocookie.com/embed/${id}`} title={`Vídeo de ${p.name}`} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />)}
            {files.map((v) => <video key={v.id} src={v.url} controls playsInline className="aspect-video w-full bg-ink" preload="metadata" />)}
          </div></section>
        )}

        <section id="avaliacoes" className="mt-20 border-t border-line pt-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div>
              <h2 className="display text-3xl">Avaliações</h2>
              {rating ? <p className="mt-3"><span className="font-serif text-5xl">{rating.toFixed(1).replace(".", ",")}</span> <span className="text-gold">{"★".repeat(Math.round(rating))}</span><span className="block text-sm text-stone">{p.ratingCount} avaliação(ões)</span></p> : <p className="mt-3 text-sm text-stone">Esta peça ainda não tem avaliações.</p>}
              <div className="mt-6">{customer ? <ReviewForm productId={p.id} /> : <p className="text-sm"><Link href={`/conta/entrar?voltar=/produto/${p.slug}`} className="underline">Entre na sua conta</Link> para avaliar.</p>}</div>
            </div>
            <ul className="space-y-8">
              {p.reviews.map((r) => (
                <li key={r.id} className="border-b border-line pb-8">
                  <div className="flex items-center gap-3"><span className="text-gold">{"★".repeat(r.rating)}</span>{r.verified && <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-700">Compra verificada</span>}</div>
                  {r.title && <div className="mt-2 font-serif text-xl">{r.title}</div>}
                  <p className="mt-2 text-sm leading-relaxed text-ink/80">{r.body}</p>
                  <div className="mt-2 text-xs text-stone">{r.authorName} · {formatDate(r.createdAt)}</div>
                  {r.reply && <div className="mt-4 border-l-2 border-gold pl-4 text-sm"><b>Resposta da Luxer:</b> {r.reply}</div>}
                  <ReportForm reviewId={r.id} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {related.length > 0 && <section className="mt-24"><SectionHead eyebrow="Você também pode gostar" title="Produtos relacionados" /><ProductGrid items={related} /></section>}
      </Container>
    </>
  );
}
