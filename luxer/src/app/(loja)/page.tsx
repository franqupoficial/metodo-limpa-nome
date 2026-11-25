import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { cardSelect, toCards, visibleWhere, type ProductCard } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media-url";
import { plainExcerpt } from "@/lib/markdown";
import { HeroCarousel } from "@/components/site/HeroCarousel";
import { ProductGrid } from "@/components/site/ProductCard";
import { SectionHead, Container } from "@/components/site/Section";
import { EditorialHero } from "@/components/site/EditorialHero";
import { Hero3D } from "@/components/luxe/Hero3D";
import { MetalConfigurator, type FinishPiece } from "@/components/luxe/MetalConfigurator";
import { GuidedGiftFlow } from "@/components/luxe/GuidedGiftFlow";
import { formatMoney } from "@/lib/format";
import { faithDevotions, faithTotal, FAITH_WHERE } from "@/lib/faith";

export const dynamic = "force-dynamic";

type Cfg = { limit?: number; text?: string; ctaLabel?: string; ctaUrl?: string; refs?: string[]; imageKey?: string; mobileKey?: string; videoUrl?: string };

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
        // Com fotografia lifestyle ou vídeo macro cadastrados no painel, a abertura usa essa mídia.
        // Sem mídia, a abertura é a cena 3D (scrollytelling), com especificação e preço dos solitários reais do acervo.
        const media = cfg.imageKey || cfg.videoUrl ? { image: mediaUrl(cfg.imageKey ?? null), mobile: mediaUrl(cfg.mobileKey ?? null), video: cfg.videoUrl ?? null } : null;
        if (media) {
          out.push(
            <EditorialHero key={sec.id} media={media} pieces={{}}
              eyebrow={sec.subtitle ?? "Alta joalheria em ouro 18k · Curitiba"}
              title={sec.title?.includes("|") ? (sec.title.split("|").map((x) => x.trim()) as [string, string]) : ["A joia certa", "para cada história."]}
              subtitle={cfg.text ?? "Alianças, anéis, correntes, brincos e pingentes em ouro 18 quilates, com certificado de garantia e atendimento de joalheria."}
              primary={{ label: cfg.ctaLabel ?? "Explorar a coleção", href: cfg.ctaUrl ?? "/busca" }} secondaryLabel="Descobrir minha joia ideal" />,
          );
        } else {
          const sol = await prisma.product.aggregate({ where: { AND: [visibleWhere(), { categories: { some: { category: { slug: "anel-solitario" } } } }] }, _min: { priceCents: true }, _count: true });
          out.push(<Hero3D key={sec.id} priceFrom={sol._min.priceCents ? formatMoney(sol._min.priceCents) : null} models={sol._count} href={sol._count ? "/categoria/anel-solitario" : "/categoria/aneis"} />);
          // seletor de metais: peça real do acervo em cada acabamento (solitário; senão, anel)
          const finish = async (color: Prisma.ProductWhereInput): Promise<FinishPiece> => {
            for (const slug of ["anel-solitario", "aneis"]) {
              const p = await prisma.product.findFirst({ where: { AND: [visibleWhere(), { images: { some: {} } }, color, { categories: { some: { category: { OR: [{ slug }, { parent: { slug } }] } } } }] }, orderBy: [{ featured: "desc" }, { priceCents: "asc" }], select: { name: true, slug: true, priceCents: true, images: { take: 1, orderBy: { position: "asc" }, select: { thumbKey: true, key: true } } } });
              if (p) return { name: p.name, slug: p.slug, price: formatMoney(p.priceCents), image: mediaUrl(p.images[0]?.thumbKey ?? p.images[0]?.key ?? null) };
            }
            return null;
          };
          const [amarelo, branco, rose] = await Promise.all([
            finish({ color: { equals: "Amarelo", mode: "insensitive" } }),
            finish({ color: { equals: "Branco", mode: "insensitive" } }),
            finish({ OR: [{ color: { in: ["Rosé", "Rose", "rosé", "rose"] } }, { goldType: { contains: "rosé", mode: "insensitive" } }] }),
          ]);
          out.push(<MetalConfigurator key={`${sec.id}-metal`} pieces={{ amarelo, branco, rose }} whatsapp={s.contact.whatsapp} />);
        }
        // banners do painel seguem como faixa editorial logo após a abertura
        const banners = await prisma.banner.findMany({ where: { placement: "HOME_HERO", active: true, imageKey: { not: null }, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] }, orderBy: { position: "asc" } });
        if (banners.length) out.push(<Container key={`${sec.id}-banners`} className="pb-20 sm:pb-28"><HeroCarousel slides={banners.map((b) => ({ id: b.id, eyebrow: b.eyebrow, title: b.title, subtitle: b.subtitle, ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl, image: mediaUrl(b.imageKey)!, mobile: mediaUrl(b.mobileKey), theme: b.theme }))} /></Container>);
        break;
      }
      case "ATELIER":
        out.push(
          <section key={sec.id} id="atelier" className="scroll-mt-20 border-t border-ink/[0.08] bg-ivory py-24 sm:py-32"><Container>
            <div className="mb-14 text-[10px] uppercase tracking-[0.45em] text-stone sm:mb-20">{sec.subtitle ?? "Guided Luxury Concierge"}</div>
            <GuidedGiftFlow whatsapp={s.contact.whatsapp} />
          </Container></section>,
        );
        break;
      case "CATEGORIES": {
        const cats = await prisma.category.findMany({ where: { parentId: null, active: true, faith: false }, orderBy: [{ position: "asc" }, { name: "asc" }], take: 8 });
        const tiles = await Promise.all(cats.map(async (c) => {
          const img = c.image ?? (await prisma.productImage.findFirst({ where: { product: { AND: [visibleWhere(), { categories: { some: { categoryId: c.id } } }] }, position: 0 }, orderBy: { product: { priceCents: "desc" } }, select: { key: true } }))?.key;
          return { ...c, img: mediaUrl(img ?? null) };
        }));
        out.push(
          <section key={sec.id} className="border-t border-line py-24 sm:py-32"><Container>
            <SectionHead eyebrow="Coleção Luxer" title={sec.title} subtitle={sec.subtitle} />
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-14 lg:grid-cols-4">
              {tiles.map((c) => (
                <Link key={c.id} href={`/categoria/${c.slug}`} className="group block">
                  <div className="aspect-[4/5] overflow-hidden bg-plate">{c.img && <img src={c.img} alt="" loading="lazy" className="h-full w-full object-contain p-[10%] transition duration-[1200ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.04]" />}</div>
                  <div className="mt-4 flex items-baseline justify-between gap-3"><span className="font-serif text-[1.35rem] sm:text-[1.6rem]">{c.name}</span><span aria-hidden className="h-px w-5 bg-ink/30 transition-all duration-500 group-hover:w-9 group-hover:bg-gold" /></div>
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
        out.push(<section key={sec.id} className="border-t border-line py-24 sm:py-32"><Container><SectionHead eyebrow={sec.type === "NEW" ? "Acabaram de chegar" : "Luxer Joias"} title={title} subtitle={subtitle} href={href} center={false} /><ProductGrid items={items} /></Container></section>);
        break;
      }
      case "COLLECTIONS": {
        const cols = await prisma.collection.findMany({ where: { active: true, featured: true }, orderBy: { position: "asc" }, take: 3 });
        if (!cols.length) break;
        out.push(
          <section key={sec.id} className="border-t border-line py-24 sm:py-32"><Container>
            <SectionHead eyebrow="Coleções" title={sec.title} subtitle={sec.subtitle} />
            <div className={`grid gap-x-6 gap-y-12 ${cols.length === 2 ? "md:grid-cols-2" : cols.length === 3 ? "md:grid-cols-3" : ""}`}>
              {cols.map((c) => <Link key={c.id} href={`/colecao/${c.slug}`} className="group block"><div className="aspect-[4/5] overflow-hidden bg-plate">{c.image && <img src={mediaUrl(c.image)!} alt="" loading="lazy" className="h-full w-full object-cover transition duration-[1200ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.03]" />}</div><div className="mt-5"><div className="eyebrow text-stone">{c.headline ?? "Coleção"}</div><div className="display mt-2 text-[2rem]">{c.name}</div></div></Link>)}
            </div>
          </Container></section>,
        );
        break;
      }
      case "FAITH": {
        // Especialização Luxer Fé: devoções e números do catálogo real (nada além do que está à venda)
        const [total, devotions, items] = await Promise.all([
          faithTotal(),
          faithDevotions({ images: true }),
          products(FAITH_WHERE, [{ featured: "desc" }, { salesCount: "desc" }, { priceCents: "desc" }], 32),
        ]);
        // variedade: uma peça por desenho (variações de cor do mesmo modelo não se repetem na vitrine)
        const stem = (n: string) => n.toLowerCase().split(/\s+/).slice(0, 3).join(" ");
        const pick: ProductCard[] = [];
        for (const it of items) if (pick.length < Math.min(limit, 4) && !pick.some((x) => stem(x.name) === stem(it.name))) pick.push(it);
        if (!total) break;
        const lead = devotions.filter((d) => d.image).slice(0, 6), more = devotions.filter((d) => !lead.includes(d));
        const names = devotions.slice(0, 4).map((d) => d.label.replace(/^Nossa Senhora .*/, "Nossa Senhora"));
        out.push(
          <section key={sec.id} className="bg-sand py-24 sm:py-32" aria-labelledby={`fe-${sec.id}`}><Container>
            <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-end lg:gap-24">
              <div>
                <div className="flex items-center gap-4"><span aria-hidden className="h-px w-8 bg-gold" /><span className="eyebrow text-stone">{sec.subtitle ?? "Especialidade da casa · Luxer Fé"}</span></div>
                <h2 id={`fe-${sec.id}`} className="display mt-6 text-[2.6rem] sm:text-[4rem]">{sec.title && sec.title !== "Luxer Fé" ? sec.title : <>Joias de <span className="italic">devoção</span></>}</h2>
              </div>
              <div>
                <p className="max-w-lg text-[15px] leading-relaxed text-ink/65">{cfg.text ?? `Uma curadoria dedicada à fé, em ouro 18 quilates: ${total} peças entre ${[...new Set(names)].join(", ")} e outras devoções — para usar todos os dias ou presentear em um momento especial.`}</p>
                <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                  <Link href={cfg.ctaUrl ?? "/luxer-fe"} className="btn-gold">{cfg.ctaLabel ?? "Explorar a Luxer Fé"}</Link>
                  <span className="text-[11px] uppercase tracking-[0.22em] text-stone">{total} peças · {devotions.length} devoções</span>
                </div>
              </div>
            </div>
            {/* índice de devoções: fotografia real da peça mais representativa de cada uma */}
            <ul className="mt-16 grid grid-cols-2 gap-x-3 gap-y-10 sm:mt-20 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-6">
              {lead.map((d) => (
                <li key={d.href}><Link href={d.href} className="group block">
                  <div className="aspect-square overflow-hidden bg-plate"><img src={d.image!} alt="" loading="lazy" className="h-full w-full object-contain p-[12%] transition duration-[1200ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.05]" /></div>
                  <div className="mt-4 font-serif text-[1.2rem] leading-tight">{d.label}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-stone">{d.count} {d.count === 1 ? "peça" : "peças"}</div>
                </Link></li>
              ))}
            </ul>
            {more.length > 0 && (
              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-line pt-8 text-[11px] uppercase tracking-[0.2em]">
                {more.map((d) => <Link key={d.href} href={d.href} className="text-ink/60 transition-colors hover:text-ink">{d.label}</Link>)}
              </div>
            )}
            {pick.length > 0 && <div className="mt-20 sm:mt-24"><ProductGrid items={pick} /></div>}
          </Container></section>,
        );
        break;
      }
      case "GUIDES": {
        // guias editoriais (significado das devoções, presentes, cuidados…) escritos no painel: Conteúdo → Páginas, tipo "Guia"
        const guides = await prisma.page.findMany({ where: { type: "GUIDE", published: true }, orderBy: [{ position: "asc" }, { publishedAt: "desc" }], take: 3, select: { slug: true, title: true, content: true, heroImageKey: true, seoDescription: true } });
        if (!guides.length) break;
        out.push(
          <section key={sec.id} className="border-t border-line py-24 sm:py-32"><Container>
            <SectionHead eyebrow={sec.subtitle ?? "Guias Luxer"} title={sec.title ?? "Para escolher com significado"} href="/guias" linkLabel="Todos os guias" center={false} />
            <div className="grid gap-x-8 gap-y-14 md:grid-cols-3">
              {guides.map((g) => (
                <Link key={g.slug} href={`/p/${g.slug}`} className="group block">
                  {g.heroImageKey && <div className="mb-6 aspect-[4/3] overflow-hidden bg-plate"><img src={mediaUrl(g.heroImageKey)!} alt="" loading="lazy" className="h-full w-full object-cover transition duration-[1200ms] group-hover:scale-[1.03]" /></div>}
                  <div className="font-serif text-[1.6rem] leading-tight">{g.title}</div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink/60">{g.seoDescription ?? plainExcerpt(g.content, 150)}</p>
                  <span className="link-line mt-5 text-ink">Ler o guia</span>
                </Link>
              ))}
            </div>
          </Container></section>,
        );
        break;
      }
      case "TRYON": {
        // o provador AR roda no aparelho do cliente: a seção aparece sempre
        out.push(
          <section key={sec.id} className="border-t border-line py-24 sm:py-32"><Container>
            <div className={`grid items-center gap-12 ${cfg.imageKey ? "lg:grid-cols-2 lg:gap-24" : "mx-auto max-w-2xl text-center"}`}>
              {cfg.imageKey && <div className="aspect-[4/5] overflow-hidden bg-plate"><img src={mediaUrl(cfg.imageKey)!} alt="" className="h-full w-full object-cover" loading="lazy" /></div>}
              <div>
                <div className="eyebrow text-stone">{sec.subtitle ?? "Luxer AR · ao vivo"}</div>
                <h2 className="display mt-5 text-[2.35rem] sm:text-[3.2rem]">{sec.title}</h2>
                <p className={`mt-6 max-w-md text-[14px] leading-relaxed text-ink/60 ${cfg.imageKey ? "" : "mx-auto"}`}>{cfg.text ?? "Abra a câmera e veja anéis, pulseiras, brincos e colares acompanhando você em tempo real. Tudo processado no seu aparelho."}</p>
                <Link href="/provador" className="btn-gold mt-10">{cfg.ctaLabel ?? "Abrir o provador"}</Link>
              </div>
            </div>
          </Container></section>,
        );
        break;
      }
      case "STORY": {
        const page = await prisma.page.findFirst({ where: { slug: "quem-somos", published: true } });
        if (!page && !cfg.text) break;
        out.push(
          <section key={sec.id} className="border-t border-line py-28 sm:py-40"><Container className="max-w-3xl text-center">
            <div className="eyebrow text-stone">Desde Curitiba</div>
            <h2 className="display mt-5 text-[2.35rem] sm:text-[3.6rem]">{sec.title}</h2>
            <div className="mx-auto my-10 h-px w-12 bg-gold" />
            <p className="font-serif text-[1.3rem] leading-[1.6] text-ink/75 sm:text-[1.6rem]">{cfg.text ?? plainExcerpt(page!.content.replace(/^## .*$/m, ""), 420)}</p>
            <Link href={cfg.ctaUrl ?? "/p/quem-somos"} className="link-line mt-12 text-ink">{cfg.ctaLabel ?? "Conheça a Luxer"}</Link>
          </Container></section>,
        );
        break;
      }
      case "REVIEWS": {
        const reviews = await prisma.review.findMany({ where: { status: "APPROVED", rating: { gte: 4 } }, orderBy: { createdAt: "desc" }, take: limit > 6 ? 6 : limit, include: { product: { select: { name: true, slug: true } } } });
        if (!reviews.length) break;
        out.push(
          <section key={sec.id} className="border-t border-line py-24 sm:py-32"><Container>
            <SectionHead eyebrow="Avaliações reais" title={sec.title} subtitle={sec.subtitle} />
            <div className="grid gap-12 md:grid-cols-3 md:gap-10">{reviews.map((r) => <figure key={r.id} className="border-t border-line pt-8"><div className="text-[11px] tracking-[0.2em] text-gold">{"★".repeat(r.rating)}</div><blockquote className="mt-5 font-serif text-[1.2rem] leading-relaxed text-ink/85">“{r.body.slice(0, 260)}”</blockquote><figcaption className="mt-6 text-[10px] uppercase tracking-[0.22em] text-stone">{r.authorName}{r.verified ? " · compra verificada" : ""}<Link href={`/produto/${r.product.slug}`} className="mt-2 block text-[12px] normal-case tracking-normal text-ink/70 underline-offset-4 hover:underline">{r.product.name}</Link></figcaption></figure>)}</div>
          </Container></section>,
        );
        break;
      }
      case "INSTAGRAM": {
        const posts = s.marketing.instagramPosts;
        if (!posts.length && !s.social.instagram) break;
        out.push(
          <section key={sec.id} className="border-t border-line py-24 sm:py-32"><Container>
            <SectionHead eyebrow="Instagram" title={sec.title} href={s.social.instagram || undefined} linkLabel="Seguir" />
            {posts.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{posts.slice(0, 6).map((p) => <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="group aspect-square overflow-hidden bg-plate"><img src={mediaUrl(p.imageKey)!} alt={p.caption ?? ""} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></a>)}</div>}
          </Container></section>,
        );
        break;
      }
      case "NEWSLETTER":
        // o formulário de newsletter já fecha todas as páginas, no rodapé; repetir aqui duplicaria o mesmo bloco
        break;
      case "EDITORIAL":
        out.push(
          <section key={sec.id} className="border-t border-line py-24 sm:py-32"><Container><div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-24">
            {cfg.imageKey && <img src={mediaUrl(cfg.imageKey)!} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />}
            <div>{sec.subtitle && <div className="eyebrow text-stone">{sec.subtitle}</div>}<h2 className="display mt-5 text-[2.35rem] sm:text-[3.2rem]">{sec.title}</h2>{cfg.text && <p className="mt-6 max-w-md text-[14px] leading-relaxed text-ink/60">{cfg.text}</p>}{cfg.ctaUrl && <Link href={cfg.ctaUrl} className="btn-gold mt-10">{cfg.ctaLabel ?? "Saiba mais"}</Link>}</div>
          </div></Container></section>,
        );
        break;
    }
  }
  return <>{out}</>;
}
