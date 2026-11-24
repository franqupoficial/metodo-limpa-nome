"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export type Slide = { id: string; eyebrow: string | null; title: string; subtitle: string | null; ctaLabel: string | null; ctaUrl: string | null; image: string; mobile: string | null; theme: string };

export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length, paused]);
  return (
    <section className="relative h-[78svh] min-h-[520px] overflow-hidden bg-ink" aria-roledescription="carrossel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, k) => (
        <div key={s.id} className={`absolute inset-0 transition-opacity duration-[1400ms] ${k === i ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={k !== i}>
          <picture>
            {s.mobile && <source media="(max-width: 767px)" srcSet={s.mobile} />}
            <img src={s.image} alt="" className={`h-full w-full object-cover ${k === i ? "animate-slow-zoom" : ""}`} fetchPriority={k === 0 ? "high" : "auto"} />
          </picture>
          <div className={`absolute inset-0 ${s.theme === "light" ? "bg-gradient-to-r from-white/70 via-white/20 to-transparent" : "bg-gradient-to-r from-black/65 via-black/25 to-transparent"}`} />
          <div className={`absolute inset-0 mx-auto flex max-w-[1440px] items-end px-6 pb-20 sm:items-center sm:px-12 sm:pb-0 ${s.theme === "light" ? "text-ink" : "text-ivory"}`}>
            <div className="max-w-xl">
              {s.eyebrow && <div className={`eyebrow animate-fade-up ${s.theme === "light" ? "text-gold-2" : "text-gold"}`}>{s.eyebrow}</div>}
              <h1 className="display mt-4 animate-fade-up text-5xl sm:text-7xl">{s.title}</h1>
              {s.subtitle && <p className="mt-5 max-w-md animate-fade-up text-base leading-relaxed opacity-85">{s.subtitle}</p>}
              {s.ctaUrl && s.ctaLabel && <Link href={`/api/banner?id=${s.id}&to=${encodeURIComponent(s.ctaUrl)}`} className={`mt-8 inline-flex animate-fade-up ${s.theme === "light" ? "btn-gold" : "btn-line border-gold text-gold"}`}>{s.ctaLabel}</Link>}
            </div>
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((s, k) => <button key={s.id} onClick={() => setI(k)} aria-label={`Banner ${k + 1}`} className={`h-[2px] transition-all ${k === i ? "w-10 bg-gold" : "w-5 bg-white/50"}`} />)}
        </div>
      )}
    </section>
  );
}
