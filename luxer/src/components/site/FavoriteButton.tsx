"use client";
import { useEffect, useState } from "react";

/** Favoritos: na conta do cliente quando logado; no navegador (localStorage) para visitantes. */
const KEY = "lx_favs";
function readLocal(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function writeLocal(v: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v.slice(0, 200)));
  } catch {}
}

export function FavoriteButton({ productId, large = false }: { productId: string; large?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(readLocal().includes(productId)); }, [productId]);
  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    const next = !on;
    setOn(next);
    const list = readLocal().filter((x) => x !== productId);
    writeLocal(next ? [productId, ...list] : list);
    await fetch("/api/favoritos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, on: next }) }).catch(() => {});
    window.dispatchEvent(new Event("lx:favs"));
  }
  return (
    <button onClick={toggle} aria-pressed={on} aria-label={on ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`flex items-center justify-center transition-opacity ${large ? "h-12 w-12 border border-line hover:border-ink" : "h-9 w-9"}`}>
      <svg viewBox="0 0 24 24" className={large ? "h-[18px] w-[18px]" : "h-4 w-4"} fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.2}>
        <path d="M12 20s-7-4.4-8.9-8.6C1.7 8.3 3.6 4.8 7 4.8c2 0 3.3 1 4 2.2.7-1.2 2-2.2 4-2.2 3.4 0 5.3 3.5 3.9 6.6C19 15.6 12 20 12 20z" />
      </svg>
    </button>
  );
}
