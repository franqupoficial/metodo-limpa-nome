"use client";
import type Lenis from "lenis";

/**
 * Instância única do Lenis (rolagem suave), compartilhada sem acoplar bundles: a cena do hero (chunk próprio,
 * com GSAP) se conecta a ela quando existe; quando não existe (celular, toque, movimento reduzido), nada muda.
 */
let current: Lenis | null = null;
const subs = new Set<(l: Lenis | null) => void>();
export const getLenis = () => current;
export function setLenis(l: Lenis | null) { current = l; subs.forEach((f) => f(l)); }
export function onLenis(f: (l: Lenis | null) => void) { subs.add(f); f(current); return () => { subs.delete(f); }; }
