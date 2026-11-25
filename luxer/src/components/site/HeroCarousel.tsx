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
    <section className="relative h-[72svh] min-h-[460px] overflow-hidden bg-surface" aria-roledescription="carrossel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, k) => (
        <div key={s.id} className={`absolute inset-0 transition-opacity duration-[1400ms] ${k === i ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={k !== i}>
          <picture>
            {s.mobile && <source media="(max-width: 767px)" srcSet={s.mobile} />}
            <img src={s.image} alt="" className={`h-full w-full object-cover ${k === i ? "animate-slow-zoom" : ""}`} fetchPriority={k === 0 ? "high" : "auto"} />
          </picture>
          <div className={`absolute inset-0 ${s.theme === "light" ? "bg-[linear-gradient(to_top,rgba(248,246,242,.75),transparent_55%)]" : "bg-[linear-gradient(to_top,rgba(11,11,12,.55),transparent_55%)]"}`} />
          <div className={`absolute inset-0 flex items-end px-6 pb-16 sm:px-12 sm:pb-14 ${s.theme === "light" ? "text-ink" : "text-ivory"}`}>
            <div className="max-w-xl">
              {s.eyebrow && <div className={`eyebrow animate-fade-up ${s.theme === "light" ? "text-stone" : "text-ivory/75"}`}>{s.eyebrow}</div>}
              <h2 className="display mt-4 animate-fade-up text-[2.4rem] sm:text-[3.6rem]">{s.title}</h2>
              {s.subtitle && <p className="mt-4 max-w-md animate-fade-up text-[14px] leading-relaxed opacity-80">{s.subtitle}</p>}
              {s.ctaUrl && s.ctaLabel && <Link href={`/api/banner?id=${s.id}&to=${encodeURIComponent(s.ctaUrl)}`} className={`mt-8 inline-flex animate-fade-up link-line ${s.theme === "light" ? "text-ink" : "text-ivory"}`}>{s.ctaLabel}</Link>}
            </div>
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <div className={`absolute bottom-6 right-6 flex gap-2 sm:right-12 ${slides[i]?.theme === "light" ? "text-ink" : "text-ivory"}`}>
          {slides.map((s, k) => <button key={s.id} onClick={() => setI(k)} aria-label={`Banner ${k + 1}`} className={`h-px transition-all duration-500 ${k === i ? "w-10 bg-current" : "w-5 bg-current opacity-40"}`} />)}
        </div>
      )}
    </section>
  );
}
