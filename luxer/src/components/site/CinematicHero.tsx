"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type HeroJewel = { name: string; slug: string; image: string; ref: string | null };
type Temp = "amarelo" | "branco" | "rose";

/** Paletas de "temperatura do ouro": luz volumétrica, partículas e destaques da interface. */
const TEMPS: Record<Temp, { label: string; light: string; particle: [number, number, number]; accent: string; soft: string; swatch: string }> = {
  amarelo: { label: "Ouro Amarelo 18k", light: "212,175,55", particle: [232, 196, 104], accent: "#c9a96e", soft: "#e7d8b8", swatch: "linear-gradient(135deg,#f6e3a6,#c9a24a 55%,#8a6a22)" },
  branco: { label: "Ouro Branco", light: "214,220,230", particle: [226, 232, 240], accent: "#b9c0cc", soft: "#e9edf2", swatch: "linear-gradient(135deg,#ffffff,#c9ced6 55%,#8c939e)" },
  rose: { label: "Ouro Rosé", light: "222,150,128", particle: [236, 176, 156], accent: "#d29a86", soft: "#f2d9cf", swatch: "linear-gradient(135deg,#ffd9cc,#d5927c 55%,#9a5b49)" },
};

export function CinematicHero({ jewels, eyebrow, title, subtitle, primary, secondaryLabel }: {
  jewels: Partial<Record<Temp, HeroJewel>> & { amarelo: HeroJewel };
  eyebrow: string;
  title: [string, string];
  subtitle: string;
  primary: { label: string; href: string };
  secondaryLabel: string;
}) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const sheen = useRef<HTMLDivElement>(null);
  const mono = useRef<HTMLDivElement>(null);
  const [temp, setTemp] = useState<Temp>("amarelo");
  const tempRef = useRef<Temp>("amarelo");
  const jewel = jewels[temp] ?? jewels.amarelo;

  // ── Partículas douradas em suspensão (canvas), pausadas fora da tela e com movimento reduzido ──
  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d", { alpha: true })!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    type P = { x: number; y: number; r: number; vx: number; vy: number; a: number; tw: number; ph: number };
    let ps: P[] = [];
    const resize = () => {
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, (w * h) / 16000));
      ps = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + 0.3, vx: (Math.random() - 0.5) * 0.12, vy: -Math.random() * 0.18 - 0.03, a: Math.random() * 0.5 + 0.2, tw: Math.random() * 0.02 + 0.005, ph: Math.random() * Math.PI * 2 }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const [r, g, b] = TEMPS[tempRef.current].particle;
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy; p.ph += p.tw;
        if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
        if (p.x < -5) p.x = w + 5; else if (p.x > w + 5) p.x = -5;
        const alpha = p.a * (0.55 + 0.45 * Math.sin(p.ph));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.shadowColor = `rgba(${r},${g},${b},${alpha})`;
        ctx.shadowBlur = p.r * 6;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (visible && !reduce) raf = requestAnimationFrame(draw);
    };
    resize();
    draw();
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduce) raf = requestAnimationFrame(draw);
    });
    io.observe(c);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", resize); };
  }, []);

  // ── Luz que segue o cursor (inércia), tilt 3D magnético, reflexo especular, entradas e ScrollTrigger ──
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const ctx = gsap.context(() => {
      // entrada editorial: máscara (clip-path) linha a linha
      gsap.fromTo(".lx-line > span", { yPercent: 105, clipPath: "inset(0 0 100% 0)" }, { yPercent: 0, clipPath: "inset(0 0 0% 0)", duration: 1.4, ease: "expo.out", stagger: 0.14, delay: 0.15 });
      gsap.from(".lx-fade", { opacity: 0, y: 18, duration: 1.1, ease: "power3.out", stagger: 0.1, delay: 0.55 });
      gsap.from(stage.current, { opacity: 0, scale: 0.92, filter: "blur(10px)", duration: 1.8, ease: "power3.out", delay: 0.2 });
      gsap.from(mono.current, { opacity: 0, letterSpacing: "0.5em", duration: 2.2, ease: "power2.out" });
      if (!reduce) {
        // flutuação contínua sutil
        gsap.to(tilt.current, { y: -12, duration: 3.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
        // varredura especular periódica
        gsap.fromTo(sheen.current, { backgroundPosition: "-120% 0" }, { backgroundPosition: "220% 0", duration: 2.6, ease: "power2.inOut", repeat: -1, repeatDelay: 3.2 });
        // parallax/escala da joia ao rolar até "Explore por categoria"
        gsap.to(stage.current, { scale: 0.78, yPercent: 18, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 } });
        gsap.to(mono.current, { yPercent: -30, opacity: 0.25, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 } });
        gsap.to(".lx-front", { yPercent: -22, opacity: 0, ease: "none", scrollTrigger: { trigger: root.current, start: "30% top", end: "bottom top", scrub: 0.6 } });
      }
    }, root);

    if (reduce || !fine) return () => ctx.revert();
    const lx = gsap.quickTo(light.current, "x", { duration: 1.4, ease: "power3.out" });
    const ly = gsap.quickTo(light.current, "y", { duration: 1.4, ease: "power3.out" });
    const rx = gsap.quickTo(tilt.current, "rotationX", { duration: 0.9, ease: "power3.out" });
    const ry = gsap.quickTo(tilt.current, "rotationY", { duration: 0.9, ease: "power3.out" });
    const mx = gsap.quickTo(mono.current, "x", { duration: 1.6, ease: "power3.out" });
    const el = root.current!;
    const onMove = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      const nx = (e.clientX - b.left) / b.width - 0.5, ny = (e.clientY - b.top) / b.height - 0.5;
      lx(nx * b.width * 0.55); ly(ny * b.height * 0.5);
      ry(nx * 16); rx(-ny * 12);
      mx(-nx * 30);
      if (sheen.current) sheen.current.style.setProperty("--sx", `${50 + nx * 60}%`);
    };
    const onLeave = () => { rx(0); ry(0); lx(0); ly(0); mx(0); };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); ctx.revert(); };
  }, []);

  // ── Temperatura do ouro: luz, partículas e destaques da interface (variáveis do tema) ──
  const applyTemp = useCallback((t: Temp) => {
    tempRef.current = t;
    setTemp(t);
    const p = TEMPS[t];
    const docEl = document.documentElement;
    // transição suave da luz: esmaece, troca a cor e reacende
    gsap.to(light.current, { opacity: 0.15, duration: 0.45, ease: "power2.in", onComplete: () => {
      light.current?.style.setProperty("--lr", p.light);
      gsap.to(light.current, { opacity: 1, duration: 1.1, ease: "power2.out" });
    } });
    docEl.style.setProperty("--color-gold", p.accent);
    docEl.style.setProperty("--color-gold-soft", p.soft);
    docEl.dataset.goldTemp = t;
    gsap.fromTo(stage.current, { opacity: 0.35, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.9, ease: "power3.out" });
  }, []);
  useEffect(() => () => { document.documentElement.style.removeProperty("--color-gold"); document.documentElement.style.removeProperty("--color-gold-soft"); }, []);

  const openFinder = () => {
    document.getElementById("atelier")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dispatchEvent(new Event("lx:finder-start"));
  };

  return (
    <section ref={root} className="lx-hero relative isolate flex min-h-[100svh] items-center overflow-hidden bg-[#060606] text-ivory" aria-label="Destaque Luxer Joias">
      {/* luz volumétrica que segue o cursor */}
      <div ref={light} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background] duration-1000"
        style={{ ["--lr" as string]: TEMPS.amarelo.light, background: "radial-gradient(circle, rgba(var(--lr),0.34) 0%, rgba(var(--lr),0.12) 35%, transparent 70%)", filter: "blur(60px)" } as React.CSSProperties} />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />

      {/* plano de fundo: tipografia monumental translúcida */}
      <div ref={mono} aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 select-none text-center font-serif leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.07)] text-[38vw] sm:text-[30vw]">18K</div>

      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-6 px-6 pb-16 pt-10 sm:px-12 lg:grid-cols-[1fr_1.05fr] lg:py-0">
        {/* plano frontal: texto editorial */}
        <div className="lx-front relative z-10 order-2 lg:order-1">
          <div className="lx-fade eyebrow text-gold">{eyebrow}</div>
          <h1 className="display mt-5 text-[3.1rem] sm:text-7xl xl:text-[5.6rem]">
            <span className="lx-line block overflow-hidden pb-1"><span className="block">{title[0]}</span></span>
            <span className="lx-line block overflow-hidden pb-2"><span className="block italic text-gold-soft">{title[1]}</span></span>
          </h1>
          <p className="lx-fade mt-6 max-w-md text-[15px] leading-relaxed text-ivory/65">{subtitle}</p>
          <div className="lx-fade mt-9 flex flex-wrap gap-3">
            <Link href={primary.href} className="lx-liquid">{primary.label}</Link>
            <button type="button" onClick={openFinder} className="lx-ghost">✦ {secondaryLabel}</button>
          </div>
          <div className="lx-fade mt-10">
            <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-ivory/40">Temperatura do ouro</div>
            <div className="flex items-center gap-3" role="radiogroup" aria-label="Temperatura do ouro">
              {(Object.keys(TEMPS) as Temp[]).map((t) => (
                <button key={t} type="button" role="radio" aria-checked={temp === t} onClick={() => applyTemp(t)} title={TEMPS[t].label}
                  className={`group flex items-center gap-2 rounded-full border px-1.5 py-1.5 pr-3 text-[11px] tracking-wide transition ${temp === t ? "border-gold/70 text-ivory" : "border-white/10 text-ivory/50 hover:border-white/30"}`}>
                  <span className="h-5 w-5 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]" style={{ background: TEMPS[t].swatch }} />
                  <span className="hidden sm:inline">{TEMPS[t].label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* plano central: a joia em perspectiva 3D */}
        <div ref={stage} className="relative order-1 mx-auto aspect-square w-full max-w-[min(560px,74vw)] lg:order-2" style={{ perspective: "1000px" }}>
          <div ref={tilt} className="relative h-full w-full" style={{ transformStyle: "preserve-3d" }}>
            <Link href={`/produto/${jewel.slug}`} aria-label={jewel.name} className="absolute inset-[8%] block">
              <img key={jewel.image} src={jewel.image} alt={jewel.name} className="lx-jewel h-full w-full object-contain" fetchPriority="high"
                style={{ filter: "drop-shadow(0 30px 40px rgba(0,0,0,.65)) drop-shadow(0 0 22px rgba(var(--lr,212,175,55),.18)) saturate(1.05) contrast(1.06)" }} />
              {/* reflexo especular restrito ao metal (máscara pelo próprio recorte) */}
              <div ref={sheen} aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen"
                style={{ WebkitMaskImage: `url(${jewel.image})`, maskImage: `url(${jewel.image})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center",
                  backgroundImage: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.55) 48%, rgba(255,255,255,0.12) 55%, transparent 65%)", backgroundSize: "60% 100%", backgroundRepeat: "no-repeat" }} />
            </Link>
            {/* sombra de contato */}
            <div aria-hidden className="absolute bottom-[4%] left-1/2 h-[7%] w-[52%] -translate-x-1/2 rounded-[50%] bg-black/80 blur-xl" style={{ transform: "translateX(-50%) translateZ(-40px)" }} />
          </div>
          <div className="lx-fade absolute -bottom-2 left-1/2 hidden w-max max-w-[90%] -translate-x-1/2 text-center text-[10px] uppercase tracking-[0.28em] text-ivory/45 sm:block">
            {jewel.name}{jewel.ref ? ` · Ref. ${jewel.ref}` : ""}
          </div>
        </div>
      </div>

      <button type="button" onClick={() => window.scrollTo({ top: window.innerHeight * 0.92, behavior: "smooth" })} aria-label="Rolar para baixo" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-ivory/40 sm:flex">
        Explorar<span className="h-10 w-px animate-pulse bg-gradient-to-b from-gold to-transparent" />
      </button>
    </section>
  );
}
