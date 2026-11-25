"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

type P = { slug: string; name: string; image: string | null; category: string };
const GROUP: Record<string, string> = { aneis: "Anéis", brincos: "Brincos", colares: "Colares", correntes: "Colares", pingentes: "Colares", pulseiras: "Pulseiras" };

/** Escolha da peça: cada uma abre a página do produto com o provador já carregado. */
export function TryOnGallery({ products }: { products: P[] }) {
  const groups = useMemo(() => ["Anéis", "Brincos", "Colares", "Pulseiras"].filter((g) => products.some((p) => GROUP[p.category] === g)), [products]);
  const [g, setG] = useState(groups[0]);
  const list = products.filter((p) => GROUP[p.category] === g).slice(0, 48);
  return (
    <div>
      <div className="mb-10 flex flex-wrap justify-center gap-x-8 gap-y-3" role="tablist">
        {groups.map((x) => <button key={x} role="tab" aria-selected={g === x} onClick={() => setG(x)} className={`border-b pb-1.5 text-[10.5px] uppercase tracking-[0.24em] transition-colors ${g === x ? "border-ink text-ink" : "border-transparent text-ink/50 hover:text-ink"}`}>{x}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
        {list.map((p) => (
          <Link key={p.slug} href={`/produto/${p.slug}?provar=1`} className="group block">
            <div className="aspect-[4/5] overflow-hidden bg-white">{p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-contain p-[8%] transition duration-700 group-hover:scale-[1.04]" />}</div>
            <div className="mt-3 line-clamp-2 font-serif text-[1.02rem] leading-snug">{p.name}</div>
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-gold-2">Provar com IA</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
