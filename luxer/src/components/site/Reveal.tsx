"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Revelação editorial ao rolar: um único IntersectionObserver para a loja inteira (CSS faz a animação —
 * sem carregar biblioteca em todas as páginas). Marque blocos com data-reveal (e --i para escalonar).
 * - O que já está na tela ao abrir a página aparece sem animação (nada pisca).
 * - Sem JavaScript, ou com "reduzir movimento", tudo fica visível normalmente.
 */
export function RevealObserver() {
  const path = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    // registro só desta página: o React reaproveita nós entre navegações (ex.: cards de uma categoria para outra);
    // um marcador persistente no DOM faria esses nós serem ignorados e ficarem invisíveis
    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in"); // já visível: sem animação
        else io.observe(el);
      });
    };
    scan();
    root.classList.add("lx-reveal");
    // conteúdo que chega depois (resultados da compra guiada, "ver mais"): observado também
    let t = 0;
    const mo = new MutationObserver(() => { cancelAnimationFrame(t); t = requestAnimationFrame(scan); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect(); mo.disconnect(); cancelAnimationFrame(t);
      // ao sair da página, nada fica pendente/escondido (nós reaproveitados chegam visíveis à próxima)
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => el.classList.add("is-in"));
    };
  }, [path]);
  return null;
}
