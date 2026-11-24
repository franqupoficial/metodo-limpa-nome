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
  useEffect(() => setOn(readLocal().includes(productId)), [productId]);
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
      className={`flex items-center justify-center rounded-full bg-white/80 backdrop-blur transition hover:bg-white ${large ? "h-11 w-11" : "h-9 w-9"}`}>
      <svg viewBox="0 0 24 24" className={large ? "h-5 w-5" : "h-4 w-4"} fill={on ? "#b8955a" : "none"} stroke={on ? "#b8955a" : "#0b0b0c"} strokeWidth={1.5}>
        <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 3 4.5 6.8 4.5c2.1 0 3.6 1.1 4.2 2.4.6-1.3 2.1-2.4 4.2-2.4 3.8 0 5.9 4 4.4 7.3C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}
