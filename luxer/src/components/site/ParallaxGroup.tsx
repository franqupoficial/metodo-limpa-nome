"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { onLenis } from "@/lib/lenis-bus";
import { reportClientError } from "@/lib/client-errors";

/**
 * Parallax editorial sutil (GSAP ScrollTrigger) para as fotografias marcadas com [data-parallax] dentro do grupo:
 * cada peça flutua poucos pixels em ritmo próprio enquanto a seção atravessa a tela — sensação de profundidade,
 * sem girar, distorcer ou "brincar" com os símbolos religiosos.
 * - GSAP só é baixado quando a seção se aproxima da tela (code splitting + carregamento sob demanda).
 * - Só no desktop com mouse e sem "reduzir movimento"; no celular, as fotos ficam paradas (rolagem nativa leve).
 * - Sincronizado com o Lenis quando ele está ativo.
 */
export function ParallaxGroup({ children, amount = 7 }: { children: ReactNode; amount?: number }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ok = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!ok) return;
    let cleanup = () => {};
    const near = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      near.disconnect();
      Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);
        const ctx = gsap.context(() => {
          el.querySelectorAll<HTMLElement>("[data-parallax]").forEach((img, i) => {
            const d = amount * (i % 2 ? 1 : -0.6) * (1 + (i % 3) * 0.25);
            gsap.fromTo(img, { yPercent: -d, scale: 1.06 }, { yPercent: d, scale: 1.06, ease: "none", scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: 0.8 } });
          });
        }, el);
        const off = onLenis((l) => { l?.on("scroll", ScrollTrigger.update); });
        cleanup = () => { off(); ctx.revert(); };
      }).catch((err) => reportClientError("gsap", err));
    }, { rootMargin: "400px" });
    near.observe(el);
    return () => { near.disconnect(); cleanup(); };
  }, [amount]);
  return <div ref={box}>{children}</div>;
}
