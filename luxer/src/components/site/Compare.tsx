"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "lx_compare";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };

/** Comparação de até 4 peças (lado a lado em /comparar). */
export function CompareButton({ productId }: { productId: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(read().includes(productId)); }, [productId]);
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
      className={`flex h-12 w-12 items-center justify-center border transition-colors ${on ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink"}`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.2}><path d="M8 3v18M16 3v18M3 8h5M16 16h5" /></svg>
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
  return <Link href="/comparar" className="fixed bottom-5 left-5 z-40 bg-ink px-5 py-3.5 text-[10.5px] uppercase tracking-[0.22em] text-ivory">Comparar ({n})</Link>;
}
