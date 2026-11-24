"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "lx_compare";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };

/** Comparação de até 4 peças (lado a lado em /comparar). */
export function CompareButton({ productId }: { productId: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(read().includes(productId)), [productId]);
  return (
    <button
      onClick={() => {
        const cur = read().filter((x) => x !== productId);
        const next = on ? cur : [productId, ...cur].slice(0, 4);
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
        setOn(!on);
        window.dispatchEvent(new Event("lx:compare"));
      }}
      aria-pressed={on} title="Comparar" aria-label={on ? "Remover da comparação" : "Adicionar à comparação"}
      className={`flex h-11 w-11 items-center justify-center rounded-full ${on ? "bg-ink text-gold" : "bg-white/80"}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M8 3v18M16 3v18M3 8h5M16 16h5" /></svg>
    </button>
  );
}

export function CompareBar() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const up = () => setN(read().length);
    up();
    window.addEventListener("lx:compare", up);
    return () => window.removeEventListener("lx:compare", up);
  }, []);
  if (n < 2) return null;
  return <Link href="/comparar" className="fixed bottom-5 left-5 z-40 bg-ink px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-gold-soft shadow-xl">Comparar ({n})</Link>;
}
