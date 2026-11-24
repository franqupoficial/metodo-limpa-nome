import Link from "next/link";
import type { ListParams } from "@/lib/catalog";
import { listProducts, facets, SORTS } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import type { Prisma } from "@prisma/client";
import { ProductGrid } from "./ProductCard";
import { Container } from "./Section";
import { TrackSearch } from "./TrackSearch";

type SP = { ordem?: string; pagina?: string; min?: string; max?: string; cor?: string; pedra?: string; disponivel?: string; promo?: string; q?: string };

function href(base: string, sp: SP, patch: Partial<SP>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, String(v));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

/** Listagem com filtros (cor, pedra, faixa de preço, disponibilidade), ordenação e paginação — tudo por URL. */
export async function CatalogView({ base, sp, params, facetWhere, header, subnav }: { base: string; sp: SP; params: ListParams; facetWhere: Prisma.ProductWhereInput; header: React.ReactNode; subnav?: { name: string; slug: string; active?: boolean }[] }) {
  const page = Math.max(1, Number(sp.pagina) || 1);
  const toCents = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) * 100 : undefined);
  const [res, f] = await Promise.all([
    listProducts({ ...params, sort: sp.ordem, page, perPage: 24, min: toCents(sp.min), max: toCents(sp.max), color: sp.cor, stone: sp.pedra, available: sp.disponivel === "1", promo: sp.promo === "1", q: sp.q ?? params.q }),
    facets(facetWhere),
  ]);
  const ranges: [number, number | null][] = ([[0, 1000], [1000, 3000], [3000, 6000], [6000, 12000], [12000, null]] as [number, number | null][]).filter(([a]) => a * 100 <= f.maxPrice) as [number, number | null][];
  const active = [sp.cor, sp.pedra, sp.min || sp.max, sp.disponivel, sp.promo].some(Boolean);
  const Filters = (
    <div className="space-y-8 text-sm">
      <div>
        <div className="eyebrow mb-3 text-stone">Preço</div>
        <ul className="space-y-2">{ranges.map(([a, b]) => {
          const on = sp.min === String(a) && (sp.max ?? "") === (b ? String(b) : "");
          return <li key={a}><Link href={href(base, sp, { min: on ? undefined : String(a), max: on ? undefined : b ? String(b) : undefined, pagina: undefined })} className={on ? "text-gold-2" : "hover:text-gold-2"}>{b ? `${formatMoney(a * 100)} a ${formatMoney(b * 100)}` : `Acima de ${formatMoney(a * 100)}`}</Link></li>;
        })}</ul>
      </div>
      {f.colors.length > 1 && <div><div className="eyebrow mb-3 text-stone">Cor do ouro</div><ul className="space-y-2">{f.colors.map(([c, n]) => <li key={c}><Link href={href(base, sp, { cor: sp.cor === c ? undefined : c, pagina: undefined })} className={sp.cor === c ? "text-gold-2" : "hover:text-gold-2"}>{c} <span className="text-stone">({n})</span></Link></li>)}</ul></div>}
      {f.stones.length > 0 && <div><div className="eyebrow mb-3 text-stone">Pedras</div><ul className="space-y-2">{f.stones.map(([c, n]) => <li key={c}><Link href={href(base, sp, { pedra: sp.pedra === c ? undefined : c, pagina: undefined })} className={sp.pedra === c ? "text-gold-2" : "hover:text-gold-2"}>{c} <span className="text-stone">({n})</span></Link></li>)}</ul></div>}
      <div className="space-y-2">
        <Link href={href(base, sp, { disponivel: sp.disponivel ? undefined : "1", pagina: undefined })} className="flex items-center gap-2"><span className={`h-3.5 w-3.5 border ${sp.disponivel ? "border-gold bg-gold" : "border-stone"}`} />Somente disponíveis</Link>
        <Link href={href(base, sp, { promo: sp.promo ? undefined : "1", pagina: undefined })} className="flex items-center gap-2"><span className={`h-3.5 w-3.5 border ${sp.promo ? "border-gold bg-gold" : "border-stone"}`} />Em promoção</Link>
      </div>
      {active && <Link href={href(base, { q: sp.q, ordem: sp.ordem }, {})} className="text-xs uppercase tracking-[0.2em] underline">Limpar filtros</Link>}
    </div>
  );
  return (
    <>
      {header}
      {sp.q && <TrackSearch q={sp.q} />}
      {subnav && subnav.length > 0 && (
        <div className="border-b border-line"><Container><div className="flex gap-6 overflow-x-auto py-4 text-[11px] uppercase tracking-[0.2em] [scrollbar-width:none]">
          {subnav.map((s) => <Link key={s.slug} href={`/categoria/${s.slug}`} className={`whitespace-nowrap ${s.active ? "text-gold-2" : "hover:text-gold-2"}`}>{s.name}</Link>)}
        </div></Container></div>
      )}
      <Container className="py-10 sm:py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <span className="text-xs text-stone">{res.total} {res.total === 1 ? "peça" : "peças"}</span>
          <div className="flex items-center gap-3">
            <details className="relative lg:hidden"><summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.2em]">Filtrar {active ? "•" : ""}</summary><div className="absolute right-0 z-20 mt-3 w-72 border border-line bg-ivory p-6 shadow-xl">{Filters}</div></details>
            <form action={base} className="flex items-center gap-2">
              {Object.entries(sp).filter(([k, v]) => v && k !== "ordem" && k !== "pagina").map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <label htmlFor="ordem" className="sr-only">Ordenar</label>
              <select id="ordem" name="ordem" defaultValue={sp.ordem ?? ""} className="border-none bg-transparent text-[11px] uppercase tracking-[0.2em] outline-none">
                <option value="">{sp.q ? "Mais relevantes" : "Destaques"}</option>
                {Object.entries(SORTS).filter(([k]) => k !== "relevancia").map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button className="text-[11px] uppercase tracking-[0.2em] text-gold-2">Aplicar</button>
            </form>
          </div>
        </div>
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">{Filters}</aside>
          <div>
            {res.items.length === 0 ? (
              <div className="py-20 text-center"><p className="font-serif text-2xl">Nenhuma joia encontrada.</p><p className="mt-2 text-sm text-stone">Tente outros termos ou remova filtros.</p></div>
            ) : <ProductGrid items={res.items} cols={3} />}
            {res.pages > 1 && (
              <nav className="mt-16 flex items-center justify-center gap-2 text-sm" aria-label="Paginação">
                {page > 1 && <Link href={href(base, sp, { pagina: String(page - 1) })} className="px-3 py-2 hover:text-gold-2">← Anterior</Link>}
                {Array.from({ length: res.pages }, (_, i) => i + 1).filter((n) => n === 1 || n === res.pages || Math.abs(n - page) <= 2).map((n, i, arr) => (
                  <span key={n} className="flex items-center gap-2">{i > 0 && arr[i - 1] !== n - 1 && <span className="text-stone">…</span>}<Link href={href(base, sp, { pagina: String(n) })} aria-current={n === page ? "page" : undefined} className={`flex h-9 w-9 items-center justify-center ${n === page ? "bg-ink text-gold-soft" : "hover:text-gold-2"}`}>{n}</Link></span>
                ))}
                {page < res.pages && <Link href={href(base, sp, { pagina: String(page + 1) })} className="px-3 py-2 hover:text-gold-2">Próxima →</Link>}
              </nav>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

export function PageTitle({ eyebrow, title, text, dark = false }: { eyebrow?: string; title: string; text?: string | null; dark?: boolean }) {
  return (
    <section className={dark ? "bg-ink text-ivory" : "bg-sand"}>
      <Container className="py-14 text-center sm:py-20">
        {eyebrow && <div className={`eyebrow ${dark ? "text-gold" : "text-gold-2"}`}>{eyebrow}</div>}
        <h1 className="display mt-3 text-5xl sm:text-6xl">{title}</h1>
        {text && <p className={`mx-auto mt-4 max-w-2xl text-sm leading-relaxed ${dark ? "text-ivory/65" : "text-ink/65"}`}>{text}</p>}
      </Container>
    </section>
  );
}
