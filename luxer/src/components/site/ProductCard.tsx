import Link from "next/link";
import type { ProductCard as Card } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import { FavoriteButton } from "./FavoriteButton";

/**
 * Card editorial: fotografia original em fundo branco natural (sem recorte, sem mix-blend),
 * nome em serifa e preço discreto. Condições de pagamento ficam na página do produto.
 */
export function ProductCard({ p, priority = false }: { p: Card; priority?: boolean }) {
  const tag = !p.available ? "Esgotado" : p.isNew ? "Novo" : p.price.discountPct ? `−${p.price.discountPct}%` : null;
  return (
    <article className="group relative">
      <Link href={`/produto/${p.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-plate">
          {p.image ? (
            <>
              <img src={p.image} alt={p.alt} loading={priority ? "eager" : "lazy"} className={`absolute inset-0 m-auto h-full w-full object-contain p-[6%] transition duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.035] ${p.hoverImage ? "group-hover:opacity-0" : ""} ${!p.available ? "opacity-70" : ""}`} />
              {p.hoverImage && <img src={p.hoverImage} alt="" aria-hidden loading="lazy" className="absolute inset-0 m-auto h-full w-full object-contain p-[6%] opacity-0 transition duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:opacity-100" />}
            </>
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-xl tracking-[0.4em] text-stone/40">LUXER</div>
          )}
          {tag && <span className="tag absolute left-4 top-4 text-stone">{tag}</span>}
        </div>
        <div className="pt-4">
          <h3 className="line-clamp-2 font-serif text-[1.08rem] leading-snug text-ink">{p.name}</h3>
          <div className="mt-1.5 flex items-baseline gap-2 text-[13px] tabular-nums">
            <span className="text-ink/85">{formatMoney(p.price.price)}</span>
            {p.price.compareAt && <span className="text-[12px] text-stone line-through">{formatMoney(p.price.compareAt)}</span>}
          </div>
        </div>
      </Link>
      <div className="absolute right-2 top-2 text-[#0b0b0c] transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100"><FavoriteButton productId={p.id} /></div>
    </article>
  );
}

export function ProductGrid({ items, cols = 4 }: { items: Card[]; cols?: 3 | 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-6 sm:gap-y-16 ${cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {items.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
    </div>
  );
}
