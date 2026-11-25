"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getLenis, setLenis } from "@/lib/lenis-bus";
import { reportClientError } from "@/lib/client-errors";

/**
 * Rolagem suave (Lenis) — só onde melhora a experiência: desktop com mouse/trackpad e sem "reduzir movimento".
 * Celular e toque ficam com a rolagem nativa (inércia do sistema, mais confiável e acessível).
 * - Carregado sob demanda (não pesa na primeira renderização).
 * - Não interfere em menus, modais, listas roláveis e campos: elementos com [data-lenis-prevent], diálogos e
 *   áreas com rolagem própria usam a rolagem nativa; com a página travada (menu aberto), o Lenis se cala.
 * - Teclado, links âncora (#atelier) e o "voltar ao topo" do navegador continuam nativos.
 */
export function SmoothScroll() {
  const path = usePathname();
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine) and (hover: hover)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    let alive = true;
    import("lenis").then(({ default: Lenis }) => {
      if (!alive) return;
      const locked = () => getComputedStyle(document.documentElement).overflow === "hidden" || getComputedStyle(document.body).overflow === "hidden";
      const lenis = new Lenis({
        autoRaf: true,
        lerp: 0.11,           // inércia curta: suave, sem a sensação de "atraso" do cursor
        wheelMultiplier: 0.95,
        smoothWheel: true,
        syncTouch: false,
        anchors: true,
        prevent: (node: HTMLElement) => !!node.closest("[data-lenis-prevent], [role='dialog'], [aria-modal='true'], select, textarea, .overflow-y-auto, .overflow-auto"),
        virtualScroll: () => !locked(),
      });
      setLenis(lenis);
    }).catch((e) => reportClientError("lenis", e));
    return () => { alive = false; getLenis()?.destroy(); setLenis(null); };
  }, []);
  // nova página: o Lenis assume a posição definida pelo roteador (topo ou restauração do "voltar")
  useEffect(() => { const l = getLenis(); if (l) { l.resize(); l.scrollTo(window.scrollY, { immediate: true }); } }, [path]);
  return null;
}
