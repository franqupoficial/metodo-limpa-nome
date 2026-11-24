import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { cardSelect, toCards, visibleWhere, type ProductCard } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media-url";
import { plainExcerpt } from "@/lib/markdown";
import { providerConfigured } from "@/lib/ai/tryon";
import { HeroCarousel } from "@/components/site/HeroCarousel";
import { ProductGrid } from "@/components/site/ProductCard";
import { SectionHead, Container } from "@/components/site/Section";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { CinematicHero, type HeroJewel } from "@/components/site/CinematicHero";
import { AtelierFinder } from "@/components/site/AtelierFinder";
import { cutoutUrl } from "@/lib/cutout";

export const dynamic = "force-dynamic";

type Cfg = { limit?: number; text?: string; ctaLabel?: string; ctaUrl?: string; refs?: string[]; imageKey?: string };

async function products(where: Prisma.ProductWhereInput, orderBy: Prisma.ProductOrderByWithRelationInput[], take: number) {
  return toCards(await prisma.product.findMany({ where: { AND: [visibleWhere(), { images: { some: {} } }, where] }, orderBy, take, select: cardSelect }));
}
async function byRefs(refs: string[]) {
  const rows = await prisma.product.findMany({ where: { AND: [visibleWhere(), { OR: [{ ref: { in: refs } }, { sku: { in: refs } }] }] }, select: cardSelect });
  return toCards(refs.map((r) => rows.find((p) => p.ref === r)).filter(Boolean) as typeof rows);
}

export default async function Home() {
  const s = await getSettings();
  const now = new Date();
  const sections = await prisma.homeSection.findMany({ where: { active: true }, orderBy: { position: "asc" } });
  const out: React.ReactNode[] = [];

  for (const sec of sections) {
    const cfg = (sec.config ?? {}) as Cfg;
    const limit = cfg.limit ?? 8;
    switch (sec.type) {
      case "HERO": {
        // joia em destaque por temperatura do ouro (peças reais do catálogo); referências fixas via config.refs
        const pick = async (where: Prisma.ProductWhereInput): Promise<HeroJewel | null> => {
          const p = await prisma.product.findFirst({ where: { AND: [visibleWhere(), { images: { some: {} } }, cfg.refs?.length ? { ref: { in: cfg.refs } } : {}, where] }, orderBy: [{ featured: "desc" }, { bestSeller: "desc" }, { priceCents: "desc" }], select: { name: true, slug: true, ref: true, images: { take: 1, orderBy: { position: "asc" }, select: { id: true } } } });
          if (!p?.images[0]) return null;
          const image = await cutoutUrl(p.images[0].id);
          return image ? { name: p.name, slug: p.slug, ref: p.ref, image } : null;
        };
        const inCat = (slug: string) => ({ categories: { some: { category: { OR: [{ slug }, { parent: { slug } }] } } } });
        const amarelo = (await pick({ AND: [inCat("aneis"), { color: { contains: "amarelo", mode: "insensitive" } }, { stoneType: { not: null } }] })) ?? (await pick({}));
        if (!amarelo) break;
        const branco = await pick({ AND: [inCat("aneis"), { color: { contains: "branco", mode: "insensitive" } }] });
        const rose = (await pick({ AND: [{ OR: [inCat("aneis"), inCat("pingentes"), inCat("brincos")] }, { OR: [{ color: { contains: "ros", mode: "insensitive" } }, { goldType: { contains: "ros", mode: "insensitive" } }] }] }));
        out.push(
          <CinematicHero key={sec.id} jewels={{ amarelo, ...(branco ? { branco } : {}), ...(rose ? { rose } : {}) }}
            eyebrow={sec.subtitle ?? "Alta joalheria em ouro 18 quilates · Curitiba"}
            title={sec.title?.includes("|") ? (sec.title.split("|").map((x) => x.trim()) as [string, string]) : ["A joia certa", "para cada história."]}
            subtitle={cfg.text ?? "Alianças, anéis, correntes, brincos e pingentes em ouro 18k — com certificado de garantia, nota fiscal e atendimento de joalheria."}
            primary={{ label: cfg.ctaLabel ?? "Explorar coleção", href: cfg.ctaUrl ?? "/busca" }} secondaryLabel="Descobrir minha joia ideal" />,
        );
        // banners do painel seguem como faixa editorial logo após a abertura
        const banners = await prisma.banner.findMany({ where: { placement: "HOME_HERO", active: true, imageKey: { not: null }, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] }, orderBy: { position: "asc" } });
        if (banners.length) out.push(<div key={`${sec.id}-banners`} className="[&>section]:h-[62svh] [&>section]:min-h-[420px]"><HeroCarousel slides={banners.map((b) => ({ id: b.id, eyebrow: b.eyebrow, title: b.title, subtitle: b.subtitle, ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl, image: mediaUrl(b.imageKey)!, mobile: mediaUrl(b.mobileKey), theme: b.theme }))} /></div>);
        break;
      }
      case "ATELIER":
        out.push(
          <section key={sec.id} id="atelier" className="relative overflow-hidden bg-[#060606] py-20 sm:py-28">
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[50vmin] w-[80vmin] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.12),transparent_70%)] blur-3xl" />
            <Container className="relative">
              <div className="mb-10 text-center"><div className="eyebrow text-[var(--color-atelier)]">{sec.subtitle ?? "Atelier Concierge"}</div><h2 className="display mt-3 text-4xl text-ivory sm:text-5xl">{sec.title ?? "Encontre a joia ideal em três escolhas"}</h2></div>
              <AtelierFinder whatsapp={s.contact.whatsapp} />
            </Container>
          </section>,
        );
        break;
      case "CATEGORIES": {
        const cats = await prisma.category.findMany({ where: { parentId: null, active: true, faith: false }, orderBy: [{ position: "asc" }, { name: "asc" }], take: 8 });
        const tiles = await Promise.all(cats.map(async (c) => {
          const img = c.image ?? (await prisma.productImage.findFirst({ where: { product: { AND: [visibleWhere(), { categories: { some: { categoryId: c.id } } }] }, position: 0 }, orderBy: { product: { priceCents: "desc" } }, select: { thumbKey: true } }))?.thumbKey;
          return { ...c, img: mediaUrl(img ?? null) };
        }));
        out.push(
          <section key={sec.id} className="py-20 sm:py-28"><Container>
            <SectionHead eyebrow="Coleção Luxer" title={sec.title} subtitle={sec.subtitle} />
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {tiles.map((c) => (
                <Link key={c.id} href={`/categoria/${c.slug}`} className="group relative aspect-[4/5] overflow-hidden bg-sand">
                  {c.img && <img src={c.img} alt="" loading="lazy" className="h-full w-full object-cover mix-blend-multiply transition duration-[1200ms] group-hover:scale-105" />}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-5 pt-16"><div className="font-serif text-2xl text-ivory sm:text-3xl">{c.name}</div><div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-gold-soft opacity-0 transition group-hover:opacity-100">Explorar</div></div>
                </Link>
              ))}
            </div>
          </Container></section>,
        );
        break;
      }
      case "BESTSELLERS":
      case "NEW":
      case "RECOMMENDED":
      case "PRODUCTS": {
        let items: ProductCard[] = [];
        let title = sec.title;
        let subtitle = sec.subtitle;
        let href: string | undefined;
        if (cfg.refs?.length) items = await byRefs(cfg.refs.slice(0, limit));
        else if (sec.type === "BESTSELLERS") {
          const withData = await prisma.product.count({ where: { OR: [{ salesCount: { gt: 0 } }, { bestSeller: true }] } });
          // sem histórico de vendas, não afirmamos "mais vendidos": vira uma seleção da loja
          if (withData) items = await products({ OR: [{ salesCount: { gt: 0 } }, { bestSeller: true }] }, [{ bestSeller: "desc" }, { salesCount: "desc" }], limit);
          else { items = await products({}, [{ featured: "desc" }, { priceCents: "desc" }], limit); title = "Seleção Luxer"; subtitle = "Peças escolhidas do nosso catálogo"; }
          href = "/busca?ordem=mais-vendidos";
        } else if (sec.type === "NEW") { items = await products({}, [{ isNew: "desc" }, { createdAt: "desc" }, { sourceId: { sort: "desc", nulls: "last" } }], limit); href = "/busca?ordem=novidades"; }
        else if (sec.type === "RECOMMENDED") items = await products({ featured: true }, [{ updatedAt: "desc" }], limit);
        if (!items.length) break;
        out.push(<section key={sec.id} className="py-20 sm:py-24"><Container><SectionHead eyebrow={sec.type === "NEW" ? "Acabaram de chegar" : "Luxer Joias"} title={title} subtitle={subtitle} href={href} /><ProductGrid items={items} /></Container></section>);
        break;
      }
      case "COLLECTIONS": {
        const cols = await prisma.collection.findMany({ where: { active: true, featured: true }, orderBy: { position: "asc" }, take: 3 });
        if (!cols.length) break;
        out.push(
          <section key={sec.id} className="bg-sand py-20 sm:py-28"><Container>
            <SectionHead eyebrow="Coleções" title={sec.title} subtitle={sec.subtitle} />
            <div className={`grid gap-5 ${cols.length > 1 ? "md:grid-cols-" + cols.length : ""}`}>
              {cols.map((c) => <Link key={c.id} href={`/colecao/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-ink md:aspect-[3/4]">{c.image && <img src={mediaUrl(c.image)!} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition duration-[1200ms] group-hover:scale-105" />}<div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-8 text-ivory"><div className="eyebrow text-gold">{c.headline ?? "Coleção"}</div><div className="display mt-2 text-4xl">{c.name}</div></div></Link>)}
            </div>
          </Container></section>,
        );
        break;
      }
      case "FAITH": {
        const items = await products({ categories: { some: { category: { faith: true } } } }, [{ featured: "desc" }, { salesCount: "desc" }, { priceCents: "desc" }], 4);
        if (!items.length) break;
        const faithCuts = await Promise.all(items.map(async (p) => {
          const img = await prisma.productImage.findFirst({ where: { product: { slug: p.slug } }, orderBy: { position: "asc" }, select: { id: true } });
          return img ? cutoutUrl(img.id) : p.image;
        }));
        out.push(
          <section key={sec.id} className="bg-[#060606] py-20 text-ivory sm:py-28"><Container>
            <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-center">
              <div>
                <div className="eyebrow text-gold">Luxer Fé</div>
                <h2 className="display mt-4 text-5xl">{sec.title ?? "Luxer Fé"}</h2>
                <p className="mt-5 max-w-sm leading-relaxed text-ivory/65">{cfg.text ?? sec.subtitle ?? "Nossa Senhora, Divino Espírito Santo, crucifixos, medalhas e escapulários em ouro 18k — joias que acompanham a sua fé."}</p>
                <Link href={cfg.ctaUrl ?? "/luxer-fe"} className="btn-line mt-8 border-gold text-gold">{cfg.ctaLabel ?? "Conhecer a coleção"}</Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{items.map((p, k) => <Link key={p.id} href={`/produto/${p.slug}`} className="group"><div className="relative aspect-square"><div aria-hidden className="absolute inset-[20%] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.16),transparent_70%)] blur-2xl transition group-hover:opacity-100" />{faithCuts[k] && <img src={faithCuts[k]!} alt={p.alt} loading="lazy" className="relative h-full w-full object-contain p-3 transition duration-700 [filter:drop-shadow(0_18px_20px_rgba(0,0,0,.6))] group-hover:scale-105" />}</div><div className="mt-3 line-clamp-2 font-serif text-sm text-ivory/90">{p.name}</div><div className="mt-1 text-xs text-gold">{p.price.price ? (p.price.price / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""}</div></Link>)}</div>
            </div>
          </Container></section>,
        );
        break;
      }
      case "TRYON": {
        if (!s.ai.tryOnEnabled || !providerConfigured(s.ai.provider)) break;
        out.push(
          <section key={sec.id} className="py-20 sm:py-28"><Container>
            <div className="grid overflow-hidden bg-sand lg:grid-cols-2">
              <div className="flex flex-col justify-center p-10 sm:p-16">
                <div className="eyebrow text-gold-2">{sec.subtitle ?? "LUXER AI TRY-ON"}</div>
                <h2 className="display mt-4 text-4xl sm:text-5xl">{sec.title}</h2>
                <p className="mt-5 max-w-md leading-relaxed text-ink/70">{cfg.text ?? "Envie uma foto, escolha a peça e veja uma simulação realista de como ela fica em você — colares, correntes, pingentes, brincos, pulseiras e anéis."}</p>
                <Link href="/provador" className="btn-gold mt-8 self-start">{cfg.ctaLabel ?? "Experimentar agora"}</Link>
              </div>
              <div className="relative min-h-[320px] bg-ink">{cfg.imageKey ? <img src={mediaUrl(cfg.imageKey)!} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <div className="absolute inset-0 flex items-center justify-center font-serif text-6xl tracking-[0.3em] text-gold/30">AI</div>}</div>
            </div>
          </Container></section>,
        );
        break;
      }
      case "STORY": {
        const page = await prisma.page.findFirst({ where: { slug: "quem-somos", published: true } });
        if (!page && !cfg.text) break;
        out.push(
          <section key={sec.id} className="py-20 sm:py-32"><Container className="max-w-4xl text-center">
            <div className="eyebrow text-gold-2">Desde Curitiba</div>
            <h2 className="display mt-4 text-4xl sm:text-6xl">{sec.title}</h2>
            <div className="gold-rule mx-auto my-8 w-24" />
            <p className="font-serif text-xl leading-relaxed text-ink/80 sm:text-2xl">{cfg.text ?? plainExcerpt(page!.content.replace(/^## .*$/m, ""), 420)}</p>
            <Link href={cfg.ctaUrl ?? "/p/quem-somos"} className="btn-line mt-10">{cfg.ctaLabel ?? "Conheça a Luxer"}</Link>
          </Container></section>,
        );
        break;
      }
      case "REVIEWS": {
        const reviews = await prisma.review.findMany({ where: { status: "APPROVED", rating: { gte: 4 } }, orderBy: { createdAt: "desc" }, take: limit > 6 ? 6 : limit, include: { product: { select: { name: true, slug: true } } } });
        if (!reviews.length) break;
        out.push(
          <section key={sec.id} className="bg-sand py-20 sm:py-24"><Container>
            <SectionHead eyebrow="Avaliações reais" title={sec.title} subtitle={sec.subtitle} />
            <div className="grid gap-5 md:grid-cols-3">{reviews.map((r) => <figure key={r.id} className="bg-ivory p-8"><div className="text-gold">{"★".repeat(r.rating)}</div><blockquote className="mt-4 font-serif text-lg leading-relaxed">“{r.body.slice(0, 260)}”</blockquote><figcaption className="mt-5 text-xs uppercase tracking-[0.2em] text-stone">{r.authorName}{r.verified ? " · compra verificada" : ""}<Link href={`/produto/${r.product.slug}`} className="mt-1 block normal-case tracking-normal text-gold-2">{r.product.name}</Link></figcaption></figure>)}</div>
          </Container></section>,
        );
        break;
      }
      case "INSTAGRAM": {
        const posts = s.marketing.instagramPosts;
        if (!posts.length && !s.social.instagram) break;
        out.push(
          <section key={sec.id} className="py-20"><Container>
            <SectionHead eyebrow="Instagram" title={sec.title} href={s.social.instagram || undefined} linkLabel="Seguir" />
            {posts.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{posts.slice(0, 6).map((p) => <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="group aspect-square overflow-hidden bg-sand"><img src={mediaUrl(p.imageKey)!} alt={p.caption ?? ""} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></a>)}</div>}
          </Container></section>,
        );
        break;
      }
      case "NEWSLETTER":
        out.push(
          <section key={sec.id} className="border-t border-line py-20"><Container className="max-w-2xl text-center">
            <div className="eyebrow text-gold-2">Newsletter</div>
            <h2 className="display mt-3 text-4xl">{sec.title}</h2>
            {cfg.text && <p className="mt-3 text-sm text-stone">{cfg.text}</p>}
            <div className="mt-8 text-left"><NewsletterForm source="home" consentText={s.marketing.newsletterConsentText} /></div>
          </Container></section>,
        );
        break;
      case "EDITORIAL":
        out.push(
          <section key={sec.id} className="py-20"><Container><div className="grid items-center gap-10 lg:grid-cols-2">
            {cfg.imageKey && <img src={mediaUrl(cfg.imageKey)!} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />}
            <div><h2 className="display text-5xl">{sec.title}</h2>{sec.subtitle && <div className="eyebrow mt-3 text-gold-2">{sec.subtitle}</div>}{cfg.text && <p className="mt-6 leading-relaxed text-ink/70">{cfg.text}</p>}{cfg.ctaUrl && <Link href={cfg.ctaUrl} className="btn-gold mt-8">{cfg.ctaLabel ?? "Saiba mais"}</Link>}</div>
          </div></Container></section>,
        );
        break;
    }
  }
  return <>{out}</>;
}
