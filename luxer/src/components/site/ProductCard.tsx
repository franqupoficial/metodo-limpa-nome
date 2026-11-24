import Link from "next/link";
import type { ProductCard as Card } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import { FavoriteButton } from "./FavoriteButton";

export function ProductCard({ p, priority = false }: { p: Card; priority?: boolean }) {
  return (
    <article className="group relative">
      <Link href={`/produto/${p.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-sand">
          {p.image ? (
            <>
              <img src={p.image} alt={p.alt} loading={priority ? "eager" : "lazy"} className="h-full w-full object-cover mix-blend-multiply transition duration-700 group-hover:scale-[1.04]" />
              {p.hoverImage && <img src={p.hoverImage} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 mix-blend-multiply transition duration-700 group-hover:opacity-100" />}
            </>
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-2xl tracking-[0.3em] text-gold/50">LUXER</div>
          )}
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {p.price.discountPct && <span className="bg-ink px-2 py-1 text-[10px] tracking-widest text-gold-soft">−{p.price.discountPct}%</span>}
            {p.isNew && <span className="bg-white/90 px-2 py-1 text-[10px] uppercase tracking-widest text-ink">Novo</span>}
            {!p.available && <span className="bg-white/90 px-2 py-1 text-[10px] uppercase tracking-widest text-stone">Esgotado</span>}
          </div>
        </div>
        <div className="pt-4 text-center">
          <h3 className="line-clamp-2 min-h-[2.6em] font-serif text-[1.05rem] leading-snug text-ink">{p.name}</h3>
          <div className="mt-2 space-y-0.5">
            {p.price.compareAt && <div className="text-xs text-stone line-through">{formatMoney(p.price.compareAt)}</div>}
            <div className="text-sm font-medium tracking-wide text-ink">{formatMoney(p.price.price)}</div>
            <div className="text-[11px] text-stone">
              <span className="text-gold-2">{formatMoney(p.price.pix)} no Pix</span>
              {p.price.installments > 1 && <> · {p.price.installments}x {formatMoney(p.price.installmentValue)}</>}
            </div>
          </div>
        </div>
      </Link>
      <div className="absolute right-2 top-2"><FavoriteButton productId={p.id} /></div>
    </article>
  );
}

export function ProductGrid({ items, cols = 4 }: { items: Card[]; cols?: 3 | 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 ${cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {items.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
    </div>
  );
}
