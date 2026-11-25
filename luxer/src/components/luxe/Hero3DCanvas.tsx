"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown } from "lucide-react";
import { Crucifix } from "./three/Crucifix";
import { Studio } from "./three/Studio";
import { useWebGL } from "./useWebGL";
import { useStoreTheme } from "@/components/site/StoreTheme";
import { studioFor } from "@/lib/store-theme";

type Props = { priceFrom: string | null; models: number; href: string; faithTotal?: number };

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Coreografia da câmera e do anel em função do progresso da rolagem (0–1):
 *  0–30%   o anel gira 180°;
 *  30–65%  close-up macro no cruzamento da cruz e no Cristo;
 *  65–100% o anel recua para a esquerda (para cima no celular), abrindo espaço para a especificação.
 */
function Choreography({ progress, pointer }: { progress: MutableRefObject<number>; pointer: MutableRefObject<{ x: number; y: number }> }) {
  const ring = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const p = useRef(0);
  const look = useRef(new THREE.Vector3());
  const reduce = useRef(false);
  useEffect(() => { reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);
  useFrame((state, dt) => {
    p.current = THREE.MathUtils.damp(p.current, progress.current, 6, dt); // suaviza a rolagem (sem trancos)
    const s = p.current, narrow = size.width < size.height;
    const spin = smooth(0, 0.3, s), macro = smooth(0.3, 0.6, s) * (1 - smooth(0.65, 0.85, s)), side = smooth(0.65, 0.95, s);
    const idle = reduce.current ? 0 : state.clock.elapsedTime * 0.12;
    if (ring.current) {
      ring.current.rotation.y = spin * Math.PI + smooth(0.3, 0.65, s) * 0.5 + idle * (1 - macro) + pointer.current.x * 0.25;
      ring.current.rotation.x = 0.32 + pointer.current.y * 0.12 - macro * 0.2;
      ring.current.position.x = narrow ? 0 : mix(0, -1.75, side);
      ring.current.position.y = narrow ? mix(0.75, 1.85, side) : mix(0.62, 0.1, side);
      const sc = narrow ? mix(0.72, 0.44, side) : mix(0.82, 0.72, side);
      ring.current.scale.setScalar(sc);
    }
    const dist = narrow ? 8.6 : 7.2;
    camera.position.set(mix(0, 0.25, macro), mix(0.7, 1.72, macro), mix(dist, 2.0, macro));
    look.current.set(0, mix(0.55, 1.5, macro), 0);
    camera.lookAt(look.current);
  });
  return <Crucifix ref={ring} metal="amarelo" quality={size.width < 700 ? "low" : "high"} />;
}

export function Hero3DCanvas({ priceFrom, models, href, faithTotal = 0 }: Props) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const webgl = useWebGL();
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  const [active, setActive] = useState(true);
  const { theme } = useStoreTheme();
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current!;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom bottom", scrub: true, onUpdate: (st) => { progress.current = st.progress; } });
      const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6 } });
      tl.to(".h3-title", { opacity: 0, y: -60, duration: 0.24 }, 0)
        .to(".h3-hint", { opacity: 0, duration: 0.08 }, 0)
        .fromTo(".h3-num", { opacity: 0 }, { opacity: 1, duration: 0.07, stagger: 0.02 }, 0.3)
        .fromTo(".h3-num-a", { xPercent: 18 }, { xPercent: -22, duration: 0.36 }, 0.3)
        .fromTo(".h3-num-b", { xPercent: -24 }, { xPercent: 16, duration: 0.36 }, 0.3)
        .fromTo(".h3-num-c", { xPercent: 12 }, { xPercent: -10, duration: 0.36 }, 0.3)
        .to(".h3-num", { opacity: 0, duration: 0.06 }, 0.62)
        .fromTo(".h3-spec", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.14 }, 0.7)
        .to({}, { duration: 0.16 }, 0.84);
    }, el);
    // camada editorial (aditiva): fio de progresso e capítulo atual — lê o mesmo progresso, não altera a coreografia
    const rail = ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom bottom", onUpdate: (st) => {
      el.style.setProperty("--hp", st.progress.toFixed(4));
      setChapter(st.progress < 0.3 ? 0 : st.progress < 0.65 ? 1 : 2);
    } });
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    const move = (e: PointerEvent) => { pointer.current = { x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 }; };
    if (window.matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", move, { passive: true });
    return () => { ctx.revert(); rail.kill(); io.disconnect(); window.removeEventListener("pointermove", move); };
  }, []);

  return (
    <section ref={root} className="relative h-[400svh] bg-ivory text-ink" aria-label="LUXER — fé esculpida em ouro">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* brilho de estúdio ao fundo */}
        <div aria-hidden className="lx-hero-bg absolute inset-0 transition-[background] duration-700" />
        {/* números gigantes translúcidos (fase macro) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-[2vh] overflow-hidden font-serif leading-none text-ink/[0.06]">
          <span className="h3-num h3-num-a block whitespace-nowrap pl-[8vw] text-[30vw] sm:text-[22vw]">18K</span>
          <span className="h3-num h3-num-b block whitespace-nowrap text-right text-[26vw] sm:text-[18vw]">750</span>
          <span className="h3-num h3-num-c block whitespace-nowrap pl-[30vw] text-[22vw] italic sm:text-[15vw]">Au</span>
        </div>

        <div className="absolute inset-0">
          {webgl === false ? (
            <div className="flex h-full items-center justify-center"><div aria-hidden className="h-[38vmin] w-[38vmin] rounded-full border border-gold/40 shadow-[0_0_120px_color-mix(in_srgb,var(--color-gold)_15%,transparent)_inset]" /></div>
          ) : webgl && (
            <Canvas dpr={dpr} frameloop={active ? "always" : "never"} camera={{ fov: 30, near: 0.1, far: 50, position: [0, 0.55, 6.2] }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} aria-hidden>
              <PerformanceMonitor onDecline={() => setDpr([1, 1.25])} onIncline={() => setDpr([1, 2])} />
              <Suspense fallback={null}>
                <Studio key={theme} {...studioFor(theme)} />
                <Choreography progress={progress} pointer={pointer} />
              </Suspense>
            </Canvas>
          )}
        </div>

        {/* índice editorial dos capítulos + fio de progresso (acompanham a rolagem) */}
        <ol aria-hidden className="pointer-events-none absolute left-[3.2vw] top-1/2 hidden -translate-y-1/2 flex-col gap-5 text-[10px] uppercase tracking-[0.38em] lg:flex">
          {["Forma", "Detalhe", "O crucifixo"].map((c, i) => (
            <li key={c} className={`flex items-center gap-3 transition-all duration-500 ${chapter === i ? "text-ink" : "text-stone/60"}`}>
              <span className="font-serif text-[13px] normal-case tracking-normal tabular-nums">{["I", "II", "III"][i]}</span>
              <span className={`h-px bg-gold transition-all duration-500 ${chapter === i ? "w-8" : "w-3 opacity-40"}`} />
              <span className={chapter === i ? "opacity-100" : "opacity-0"}>{c}</span>
            </li>
          ))}
        </ol>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-ink/[0.08]"><div className="h-full origin-left bg-gold/70" style={{ transform: "scaleX(var(--hp, 0))" }} /></div>

        {/* fase 1: título */}
        <div className="h3-title pointer-events-none absolute inset-x-0 bottom-[14vh] px-6 text-center">
          <div className="flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.5em] text-stone"><span aria-hidden className="h-px w-8 bg-gold/60 sm:w-14" />Luxer Joias · Curitiba<span aria-hidden className="h-px w-8 bg-gold/60 sm:w-14" /></div>
          <h1 className="mt-5 font-serif text-[2.6rem] font-normal leading-[1.02] tracking-tight sm:text-[4.6rem]">
            LUXER <span className="text-gold">—</span> <span className="italic">Fé esculpida em ouro</span>
          </h1>
        </div>
        <div className="h3-hint absolute inset-x-0 bottom-6 flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-stone">
          Role para descobrir <ArrowDown className="h-4 w-4 animate-bounce" strokeWidth={1.25} />
        </div>

        {/* fase 3: especificação + compra (números reais do acervo de cruzes e crucifixos) */}
        <div className="h3-spec absolute inset-x-0 bottom-0 px-6 pb-[8vh] opacity-0 sm:inset-x-auto sm:bottom-auto sm:right-[7vw] sm:top-1/2 sm:w-[min(440px,40vw)] sm:-translate-y-1/2 sm:px-0 sm:pb-0">
          <div className="text-[10px] uppercase tracking-[0.4em] text-gold">Luxer Fé · Ouro 18k</div>
          <h2 className="mt-4 font-serif text-[2.2rem] leading-[1.05] tracking-tight sm:text-[3rem]">A fé que se leva junto ao peito.</h2>
          <dl className="mt-7 divide-y divide-ink/[0.08] border-y border-ink/[0.08] text-[13px] tracking-tight">
            <div className="flex justify-between gap-6 py-3"><dt className="text-stone">Metal</dt><dd>Ouro 18 quilates · 750</dd></div>
            <div className="flex justify-between gap-6 py-3"><dt className="text-stone">Garantia</dt><dd>Certificado e nota fiscal</dd></div>
            {models > 0 && <div className="flex justify-between gap-6 py-3"><dt className="text-stone">Cruzes e crucifixos</dt><dd>{models} modelos</dd></div>}
            {faithTotal > 0 && <div className="flex justify-between gap-6 py-3"><dt className="text-stone">Luxer Fé</dt><dd>{faithTotal} peças de devoção</dd></div>}
            {priceFrom && <div className="flex justify-between gap-6 py-3"><dt className="text-stone">Investimento</dt><dd>a partir de {priceFrom}</dd></div>}
          </dl>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link href={href} className="inline-flex items-center justify-center rounded-full bg-ink px-7 py-3.5 text-[12px] font-medium tracking-tight text-ivory transition-colors hover:bg-ink-2">Ver cruzes e crucifixos</Link>
            <Link href="/luxer-fe" className="text-[12px] tracking-tight text-ink/80 underline-offset-4 hover:text-ink hover:underline">Explorar a Luxer Fé</Link>
            <button type="button" onClick={() => { document.getElementById("atelier")?.scrollIntoView({ behavior: "smooth", block: "start" }); window.dispatchEvent(new Event("lx:finder-start")); }} className="text-[12px] tracking-tight text-ink/80 underline-offset-4 hover:text-ink hover:underline">Descobrir minha joia ideal</button>
          </div>
        </div>
      </div>
    </section>
  );
}
