"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export type HeroPiece = { name: string; slug: string; image: string; detail: string | null };
type Tone = "amarelo" | "branco" | "rose";
const TONES: Record<Tone, { label: string; dot: string }> = {
  amarelo: { label: "Ouro amarelo", dot: "linear-gradient(135deg,#efd9a0,#b8923f)" },
  branco: { label: "Ouro branco", dot: "linear-gradient(135deg,#f4f5f7,#aeb3bb)" },
  rose: { label: "Ouro rosé", dot: "linear-gradient(135deg,#f3d2c4,#c08670)" },
};

type Props = {
  eyebrow: string;
  title: [string, string];
  subtitle: string;
  primary: { label: string; href: string };
  secondaryLabel: string;
  /** Mídia lifestyle cadastrada no painel (Conteúdo → Homepage → Abertura). Quando existe, é a solução principal. */
  media: { image: string | null; mobile: string | null; video: string | null } | null;
  /** Solução temporária sem mídia lifestyle: fotografia original da peça, sem recorte, sobre painel branco. */
  pieces: Partial<Record<Tone, HeroPiece>>;
};

function startFinder() {
  document.getElementById("atelier")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.dispatchEvent(new Event("lx:finder-start"));
}

export function EditorialHero({ eyebrow, title, subtitle, primary, secondaryLabel, media, pieces }: Props) {
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const tones = (Object.keys(TONES) as Tone[]).filter((t) => pieces[t]);
  const [tone, setTone] = useState<Tone>(tones[0] ?? "amarelo");
  const piece = pieces[tone];
  const hasMedia = Boolean(media && (media.image || media.video));

  // entrada: texto revelado por linhas, imagem com leve aproximação; respeita movimento reduzido
  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".eh-line", { yPercent: 105 }, { yPercent: 0, duration: 1.3, ease: "expo.out", stagger: 0.1, delay: 0.1 });
      gsap.fromTo(".eh-fade", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1, ease: "power2.out", stagger: 0.08, delay: 0.55 });
      gsap.fromTo(".eh-media", { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 1.8, ease: "power2.out" });
    }, root);
    return () => ctx.revert();
  }, []);

  // paralaxe discreta da fotografia ao mover o cursor (somente desktop)
  useEffect(() => {
    const el = frame.current;
    if (!el || hasMedia || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const img = el.querySelector<HTMLElement>(".eh-piece");
    if (!img) return;
    const xTo = gsap.quickTo(img, "x", { duration: 1.2, ease: "power3.out" });
    const yTo = gsap.quickTo(img, "y", { duration: 1.2, ease: "power3.out" });
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); xTo(((e.clientX - r.left) / r.width - 0.5) * -12); yTo(((e.clientY - r.top) / r.height - 0.5) * -12); };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [hasMedia, tone]);

  // troca de tom: transição suave entre fotografias reais
  const pick = (t: Tone) => {
    if (t === tone) return;
    const img = frame.current?.querySelector(".eh-piece");
    if (img && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.to(img, { opacity: 0, duration: 0.3, ease: "power1.in", onComplete: () => setTone(t) });
    else setTone(t);
  };
  useEffect(() => {
    const img = frame.current?.querySelector(".eh-piece");
    if (img) gsap.to(img, { opacity: 1, duration: 0.6, ease: "power1.out" });
  }, [tone]);

  const Title = ({ light = false }: { light?: boolean }) => (
    <h1 className={`display text-[2.9rem] leading-[1.02] sm:text-[4.4rem] xl:text-[5.4rem] ${light ? "text-ivory" : ""}`}>
      <span className="block overflow-hidden pb-[0.08em]"><span className="eh-line block">{title[0]}</span></span>
      <span className="block overflow-hidden pb-[0.08em]"><span className="eh-line block italic">{title[1]}</span></span>
    </h1>
  );
  const Ctas = ({ light = false }: { light?: boolean }) => (
    <div className="eh-fade mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
      <Link href={primary.href} className={light ? "btn-line border-ivory/60 text-ivory hover:border-ivory" : "btn-gold"}>{primary.label}</Link>
      <button type="button" onClick={startFinder} className={`link-line ${light ? "text-ivory" : "text-ink"}`}>{secondaryLabel}</button>
    </div>
  );

  if (hasMedia) {
    return (
      <section ref={root} className="relative h-[calc(100svh-64px)] min-h-[560px] overflow-hidden bg-ink lg:h-[calc(100svh-125px)]">
        <div className="eh-media absolute inset-0">
          {media!.video ? (
            <video className="h-full w-full object-cover" src={media!.video} poster={media!.image ?? undefined} autoPlay muted loop playsInline preload="metadata" aria-hidden />
          ) : (
            <picture>
              {media!.mobile && <source media="(max-width: 767px)" srcSet={media!.mobile} />}
              <img src={media!.image!} alt="" className="h-full w-full object-cover" fetchPriority="high" />
            </picture>
          )}
        </div>
        {/* véu apenas onde há texto, para legibilidade sem escurecer a joia */}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(11,11,12,.55),rgba(11,11,12,0)_55%)]" />
        <div className="relative mx-auto flex h-full max-w-[1440px] items-end px-5 pb-14 sm:px-8 sm:pb-20 lg:px-12">
          <div className="max-w-2xl text-ivory">
            <div className="eh-fade eyebrow text-ivory/75">{eyebrow}</div>
            <div className="mt-6"><Title light /></div>
            <p className="eh-fade mt-6 max-w-md text-[15px] leading-relaxed text-ivory/80">{subtitle}</p>
            <Ctas light />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={root} className="mx-auto grid max-w-[1440px] items-center gap-9 px-5 pb-20 pt-2 sm:px-8 sm:pb-24 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:px-12 lg:pb-16 lg:pt-6 xl:gap-24">
      <div className="order-2 lg:order-1 lg:pb-8">
        <div className="eh-fade flex items-center gap-4"><span aria-hidden className="h-px w-8 shrink-0 bg-gold" /><span className="eyebrow text-stone">{eyebrow}</span></div>
        <div className="mt-7"><Title /></div>
        <p className="eh-fade mt-7 max-w-md text-[15px] leading-relaxed text-ink/65">{subtitle}</p>
        <Ctas />
      </div>
      {piece && (
        <figure className="order-1 lg:order-2">
          <div ref={frame} className="eh-media relative aspect-square overflow-hidden bg-white lg:aspect-auto lg:h-[clamp(440px,calc(100svh-250px),760px)]">
            <Link href={`/produto/${piece.slug}`} aria-label={piece.name} className="absolute inset-0 flex items-center justify-center">
              <img key={piece.image} src={piece.image} alt={piece.name} className="eh-piece h-full w-full object-contain p-[9%]" fetchPriority="high" />
            </Link>
            {piece.detail && (
              <div className="absolute bottom-0 right-0 hidden h-[30%] w-[24%] border-l border-t border-line bg-white xl:block">
                <img key={piece.detail} src={piece.detail} alt="" aria-hidden className="h-full w-full object-contain p-3" loading="lazy" />
              </div>
            )}
          </div>
          <figcaption className="eh-fade mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <Link href={`/produto/${piece.slug}`} className="group min-w-0">
              <span className="block truncate font-serif text-[1.05rem] text-ink/85 transition-colors group-hover:text-ink">{piece.name}</span>
            </Link>
            {tones.length > 1 && (
              <div className="flex items-center gap-4" role="group" aria-label="Tom do ouro">
                {tones.map((t) => (
                  <button key={t} type="button" onClick={() => pick(t)} aria-pressed={tone === t} title={TONES[t].label} className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] transition-colors ${tone === t ? "text-ink" : "text-stone hover:text-ink"}`}>
                    <span className={`h-3 w-3 rounded-full ${tone === t ? "ring-1 ring-ink ring-offset-2 ring-offset-ivory" : ""}`} style={{ background: TONES[t].dot }} />
                    <span className="hidden sm:inline">{TONES[t].label.replace("Ouro ", "")}</span>
                  </button>
                ))}
              </div>
            )}
          </figcaption>
        </figure>
      )}
    </section>
  );
}
