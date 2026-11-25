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
    <div className="space-y-10 text-[13px]">
      <div>
        <div className="eyebrow mb-4 text-stone">Preço</div>
        <ul className="space-y-2.5">{ranges.map(([a, b]) => {
          const on = sp.min === String(a) && (sp.max ?? "") === (b ? String(b) : "");
          return <li key={a}><Link href={href(base, sp, { min: on ? undefined : String(a), max: on ? undefined : b ? String(b) : undefined, pagina: undefined })} className={on ? "text-ink underline underline-offset-4" : "text-ink/65 transition-colors hover:text-ink"}>{b ? `${formatMoney(a * 100)} a ${formatMoney(b * 100)}` : `Acima de ${formatMoney(a * 100)}`}</Link></li>;
        })}</ul>
      </div>
      {f.colors.length > 1 && <div><div className="eyebrow mb-4 text-stone">Cor do ouro</div><ul className="space-y-2.5">{f.colors.map(([c, n]) => <li key={c}><Link href={href(base, sp, { cor: sp.cor === c ? undefined : c, pagina: undefined })} className={sp.cor === c ? "text-ink underline underline-offset-4" : "text-ink/65 transition-colors hover:text-ink"}>{c} <span className="text-stone/70">{n}</span></Link></li>)}</ul></div>}
      {f.stones.length > 0 && <div><div className="eyebrow mb-4 text-stone">Pedras</div><ul className="space-y-2.5">{f.stones.map(([c, n]) => <li key={c}><Link href={href(base, sp, { pedra: sp.pedra === c ? undefined : c, pagina: undefined })} className={sp.pedra === c ? "text-ink underline underline-offset-4" : "text-ink/65 transition-colors hover:text-ink"}>{c} <span className="text-stone/70">{n}</span></Link></li>)}</ul></div>}
      <div className="space-y-3">
        <Link href={href(base, sp, { disponivel: sp.disponivel ? undefined : "1", pagina: undefined })} className="flex items-center gap-2.5 text-ink/75 hover:text-ink"><span className={`h-3 w-3 border ${sp.disponivel ? "border-ink bg-ink" : "border-stone/60"}`} />Somente disponíveis</Link>
        <Link href={href(base, sp, { promo: sp.promo ? undefined : "1", pagina: undefined })} className="flex items-center gap-2.5 text-ink/75 hover:text-ink"><span className={`h-3 w-3 border ${sp.promo ? "border-ink bg-ink" : "border-stone/60"}`} />Em promoção</Link>
      </div>
      {active && <Link href={href(base, { q: sp.q, ordem: sp.ordem }, {})} className="link-line text-ink">Limpar filtros</Link>}
    </div>
  );
  return (
    <>
      {header}
      {sp.q && <TrackSearch q={sp.q} />}
      {subnav && subnav.length > 0 && (
        <Container><div className="-mt-2 overflow-x-auto pb-8 [scrollbar-width:none]"><div className="mx-auto flex w-max gap-7 text-[10.5px] uppercase tracking-[0.22em]">
          {subnav.map((s) => <Link key={s.slug} href={`/categoria/${s.slug}`} className={`whitespace-nowrap border-b pb-1.5 transition-colors ${s.active ? "border-ink text-ink" : "border-transparent text-ink/55 hover:text-ink"}`}>{s.name}</Link>)}
        </div></div></Container>
      )}
      <div className="bg-surface">
      <Container className="pb-24 pt-8 sm:pt-10">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
          <span className="text-[11px] tracking-[0.12em] text-stone">{res.total} {res.total === 1 ? "peça" : "peças"}</span>
          <div className="flex items-center gap-6">
            <details className="relative lg:hidden"><summary className="cursor-pointer list-none text-[10.5px] uppercase tracking-[0.22em]">Filtrar{active ? " · ativo" : ""}</summary><div className="absolute right-0 z-20 mt-4 w-[min(18rem,calc(100vw-2.5rem))] border border-line bg-surface p-7">{Filters}</div></details>
            <form action={base} className="flex items-center gap-2">
              {Object.entries(sp).filter(([k, v]) => v && k !== "ordem" && k !== "pagina").map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <label htmlFor="ordem" className="sr-only">Ordenar</label>
              <select id="ordem" name="ordem" defaultValue={sp.ordem ?? ""} className="max-w-[10.5rem] border-none bg-transparent text-[10.5px] uppercase tracking-[0.22em] outline-none">
                <option value="">{sp.q ? "Mais relevantes" : "Destaques"}</option>
                {Object.entries(SORTS).filter(([k]) => k !== "relevancia").map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button className="text-[10.5px] uppercase tracking-[0.22em] text-stone underline-offset-4 hover:text-ink hover:underline">Aplicar</button>
            </form>
          </div>
        </div>
        <div className="grid gap-12 lg:grid-cols-[200px_1fr] lg:gap-16">
          <aside className="hidden lg:block">{Filters}</aside>
          <div>
            {res.items.length === 0 ? (
              <div className="py-24 text-center"><p className="font-serif text-2xl text-ink/80">Nenhuma joia encontrada.</p><p className="mt-3 text-[13px] text-stone">Tente outros termos ou remova filtros.</p></div>
            ) : <ProductGrid items={res.items} cols={3} />}
            {res.pages > 1 && (
              <nav className="mt-20 flex flex-wrap items-center justify-center gap-1 text-[13px] tabular-nums" aria-label="Paginação">
                {page > 1 && <Link href={href(base, sp, { pagina: String(page - 1) })} className="px-3 py-2 text-ink/60 hover:text-ink">Anterior</Link>}
                {Array.from({ length: res.pages }, (_, i) => i + 1).filter((n) => n === 1 || n === res.pages || Math.abs(n - page) <= 2).map((n, i, arr) => (
                  <span key={n} className="flex items-center gap-2">{i > 0 && arr[i - 1] !== n - 1 && <span className="text-stone">…</span>}<Link href={href(base, sp, { pagina: String(n) })} aria-current={n === page ? "page" : undefined} className={`flex h-9 w-9 items-center justify-center border-b ${n === page ? "border-ink text-ink" : "border-transparent text-ink/50 hover:text-ink"}`}>{n}</Link></span>
                ))}
                {page < res.pages && <Link href={href(base, sp, { pagina: String(page + 1) })} className="px-3 py-2 text-ink/60 hover:text-ink">Próxima</Link>}
              </nav>
            )}
          </div>
        </div>
      </Container>
      </div>
    </>
  );
}

/** Título das listagens: tipografia sobre o off-white, sem blocos de cor. */
export function PageTitle({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string | null; dark?: boolean }) {
  return (
    <section>
      <Container className="pb-10 pt-14 text-center sm:pb-12 sm:pt-20">
        {eyebrow && <div className="eyebrow text-stone">{eyebrow}</div>}
        <h1 className="display mt-4 text-[2.7rem] sm:text-[4.2rem]">{title}</h1>
        {text && <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-ink/60">{text}</p>}
      </Container>
    </section>
  );
}
