"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProductCard as Card } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

type Item = Card & { material: string | null; color: string | null; weightG: number | null; stoneType: string | null; karat: string | null; specs: { label: string; value: string }[] | null };
const read = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };

export function FavoritesList({ logged }: { logged: boolean }) {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    const load = () => {
      const local = read("lx_favs");
      if (logged && local.length) fetch("/api/favoritos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sync: local }) }).catch(() => {});
      fetch(`/api/produtos?ids=${local.join(",")}${logged ? "&favoritos=1" : ""}`).then((r) => r.json()).then((d) => setItems(d.items));
    };
    load();
    window.addEventListener("lx:favs", load);
    return () => window.removeEventListener("lx:favs", load);
  }, [logged]);
  if (!items) return <p className="text-stone">Carregando…</p>;
  if (!items.length) return <div className="py-16 text-center"><p className="font-serif text-2xl">Você ainda não tem favoritos.</p><p className="mt-2 text-sm text-stone">Toque no coração das peças para salvá-las aqui.</p><Link href="/" className="btn-gold mt-8">Descobrir joias</Link></div>;
  return <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>;
}

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CompareTable() {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    const ids = read("lx_compare");
    if (!ids.length) return setItems([]);
    fetch(`/api/produtos?ids=${ids.join(",")}`).then((r) => r.json()).then((d) => setItems(d.items));
  }, []);
  const remove = (id: string) => {
    const next = read("lx_compare").filter((x) => x !== id);
    try { localStorage.setItem("lx_compare", JSON.stringify(next)); } catch {}
    setItems((x) => x?.filter((i) => i.id !== id) ?? null);
  };
  if (!items) return <p className="text-stone">Carregando…</p>;
  if (items.length < 2) return <p className="py-16 text-center text-stone">Adicione ao menos duas peças à comparação (ícone ⫴ na página do produto).</p>;
  const labels = [...new Set(items.flatMap((i) => (i.specs ?? []).map((s) => s.label)))].filter((l) => !["Cor", "Material", "Pedras", "Peso médio"].includes(l));
  const row = (label: string, fn: (i: Item) => React.ReactNode) => <tr className="border-b border-line"><th className="w-40 py-3 pr-4 text-left align-top text-xs font-normal uppercase tracking-[0.15em] text-stone">{label}</th>{items.map((i) => <td key={i.id} className="px-3 py-3 align-top text-sm">{fn(i) ?? "—"}</td>)}</tr>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] table-fixed">
        <thead><tr><th className="w-40" />{items.map((i) => <th key={i.id} className="px-3 pb-6 text-left align-top font-normal"><Link href={`/produto/${i.slug}`}><div className="aspect-square bg-sand">{i.image && <img src={i.image} alt="" className="h-full w-full object-cover mix-blend-multiply" />}</div><div className="mt-3 font-serif text-lg leading-snug">{i.name}</div></Link><button onClick={() => remove(i.id)} className="mt-2 text-xs text-stone underline">remover</button></th>)}</tr></thead>
        <tbody>
          {row("Preço", (i) => brl(i.price.price))}
          {row("No Pix", (i) => brl(i.price.pix))}
          {row("Material", (i) => i.material)}
          {row("Quilatagem", (i) => i.karat)}
          {row("Cor", (i) => i.color)}
          {row("Pedras", (i) => i.stoneType)}
          {row("Peso médio", (i) => (i.weightG ? `${i.weightG.toLocaleString("pt-BR")} g` : null))}
          {labels.map((l) => <tr key={l} className="border-b border-line"><th className="py-3 pr-4 text-left text-xs font-normal uppercase tracking-[0.15em] text-stone">{l}</th>{items.map((i) => <td key={i.id} className="px-3 py-3 text-sm">{i.specs?.find((s) => s.label === l)?.value ?? "—"}</td>)}</tr>)}
          {row("Disponibilidade", (i) => (i.available ? "Disponível" : "Esgotado"))}
        </tbody>
      </table>
    </div>
  );
}
