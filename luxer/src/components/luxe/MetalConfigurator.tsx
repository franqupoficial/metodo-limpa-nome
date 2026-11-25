"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useSpring, type MotionValue } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { METALS, type Metal } from "./three/metals";
import { useWebGL } from "./useWebGL";
import { SceneBoundary } from "./SceneBoundary";

export type FinishPiece = { name: string; slug: string; price: string; image: string | null } | null;
type Props = { pieces: Record<Metal, FinishPiece>; whatsapp: string };

const Stage = dynamic(() => import("./MetalStage").then((m) => m.MetalStage), { ssr: false, loading: () => <div className="h-full w-full" /> });

/** "One Design. Three Finishes." — o mesmo anel em três ligas, com troca de metal em tempo real. */
export function MetalConfigurator({ pieces, whatsapp }: Props) {
  const [metal, setMetal] = useState<Metal>("amarelo");
  const order: Metal[] = ["amarelo", "branco", "rose"];
  const webgl = useWebGL();
  // o palco 3D só renderiza quando a seção está visível (economia de bateria/GPU)
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  // rotação com física de mola: cada troca gira o anel 120° e ele assenta com leve oscilação
  const spin = useSpring(0, { stiffness: 55, damping: 11, mass: 1 });
  const turns = useRef(0);
  const choose = (m: Metal) => {
    if (m === metal) return;
    turns.current += (order.indexOf(m) > order.indexOf(metal) ? 1 : -1) * ((Math.PI * 2) / 3);
    spin.set(turns.current);
    setMetal(m);
  };
  const piece = pieces[metal];
  const wa = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Tenho interesse em uma joia em ${METALS[metal].label}. Podem me ajudar?`)}`;

  return (
    <section className="relative border-t border-ink/[0.08] bg-ivory py-24 text-ink sm:py-32" aria-labelledby="mc-title">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:px-12 [&>*]:min-w-0">
        <div ref={box} className="relative aspect-square w-full overflow-hidden rounded-[28px] border border-ink/[0.08] bg-surface">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_45%,color-mix(in_srgb,var(--color-gold)_8%,transparent),transparent_70%)]" />
          {webgl === false ? (
            <div className="flex h-full items-center justify-center"><div className="h-1/2 w-1/2 rounded-full transition-[background] duration-700" style={{ background: METALS[metal].swatch, maskImage: "radial-gradient(circle, transparent 58%, #000 60%, #000 70%, transparent 72%)" }} /></div>
          ) : webgl && <SceneBoundary name="metal-stage" fallback={<div className="flex h-full items-center justify-center text-[12px] tracking-tight text-stone">Visualização 3D indisponível neste aparelho.</div>}><Stage metal={metal} spin={spin as MotionValue<number>} active={visible} /></SceneBoundary>}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold sm:tracking-[0.45em]">One design. Three finishes.</div>
          <h2 id="mc-title" className="mt-5 font-serif text-[2.4rem] leading-[1.04] tracking-tight sm:text-[3.4rem]">Um desenho.<br /><span className="italic">Três acabamentos.</span></h2>
          <div role="radiogroup" aria-label="Acabamento do metal" className="mt-10 flex flex-wrap gap-3">
            {order.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={metal === m} onClick={() => choose(m)}
                className={`group flex items-center gap-3 rounded-full border px-4 py-2.5 text-[13px] tracking-tight transition-colors ${metal === m ? "border-gold/70 bg-ink/[0.04] text-ink" : "border-ink/[0.08] text-stone hover:border-ink/20 hover:text-ink"}`}>
                <span className="h-4 w-4 rounded-full ring-1 ring-ink/20" style={{ background: METALS[m].swatch }} />
                {METALS[m].label}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={metal} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
              className="mt-10 rounded-2xl border border-ink/[0.08] bg-surface p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4 text-[12px] tracking-tight text-stone"><span>Acabamento</span><span className="text-ink">{METALS[metal].label}</span></div>
              {piece ? (
                <>
                  <div className="mt-5 flex items-center gap-4">
                    {piece.image && <img src={piece.image} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white object-contain p-1" />}
                    <div className="min-w-0"><div className="text-[11px] tracking-tight text-stone">Do acervo, neste acabamento</div><div className="truncate font-serif text-xl">{piece.name}</div></div>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-[1.6rem] font-light tracking-tight">{piece.price}</div>
                    <Link href={`/produto/${piece.slug}`} className="inline-flex items-center rounded-full bg-ink px-6 py-3 text-[12px] font-medium tracking-tight text-ivory transition-colors hover:bg-ink-2">Ver a peça</Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-5 font-serif text-xl">Sob encomenda neste acabamento</p>
                  <p className="mt-2 text-[13px] leading-relaxed tracking-tight text-stone">No momento não há peça pronta em {METALS[metal].short.toLowerCase()} no acervo. Nossa equipe orienta modelos e prazos.</p>
                  {whatsapp && <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-3 text-[12px] tracking-tight transition-colors hover:border-ink/40"><MessageCircle className="h-4 w-4" strokeWidth={1.25} />Consultar especialista</a>}
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <p className="mt-4 text-[11px] tracking-tight text-stone">Modelo 3D ilustrativo. Cada peça do acervo tem desenho próprio — veja as fotos na página da joia.</p>
        </div>
      </div>
    </section>
  );
}
