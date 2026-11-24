"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Cat = { id: string; name: string; slug: string; faith: boolean; children: { id: string; name: string; slug: string }[] };

function I({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d={d} /></svg>;
}
const ICON = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3",
  user: "M20 21v-1a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  heart: "M12 21s-7.5-4.6-9.6-9.2C.9 8.5 3 4.5 6.8 4.5c2.1 0 3.6 1.1 4.2 2.4.6-1.3 2.1-2.4 4.2-2.4 3.8 0 5.9 4 4.4 7.3C19.5 16.4 12 21 12 21z",
  bag: "M6 7h12l1 14H5zM9 7V6a3 3 0 0 1 6 0v1",
  menu: "M3 7h18M3 12h18M3 17h18",
  x: "M6 6l12 12M18 6 6 18",
};

export function Header({ cats, cartCount, logo, storeName, announcement, logged }: { cats: Cat[]; cartCount: number; logo: string | null; storeName: string; announcement: string; logged: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [mega, setMega] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const path = usePathname();
  useEffect(() => { setOpen(false); setSearch(false); setMega(null); }, [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const nav = cats.filter((c) => !c.faith);

  return (
    <>
      <div className="bg-ink px-4 py-2 text-center text-[10px] uppercase tracking-[0.28em] text-gold-soft/90 sm:text-[11px]">{announcement}</div>
      <header className={`sticky top-0 z-40 border-b transition-colors ${scrolled ? "border-line bg-ivory/95 backdrop-blur" : "border-transparent bg-ivory"}`} onMouseLeave={() => setMega(null)}>
        <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-20 sm:px-8">
          <div className="flex items-center gap-1">
            <button onClick={() => setOpen(true)} className="p-2 lg:hidden" aria-label="Abrir menu"><I d={ICON.menu} /></button>
            <button onClick={() => setSearch(true)} className="p-2" aria-label="Buscar"><I d={ICON.search} /></button>
          </div>
          <Link href="/" className="flex items-center" aria-label={`${storeName} — página inicial`}>
            {logo ? <img src={logo} alt={storeName} className="h-8 w-auto sm:h-10" /> : <span className="font-serif text-[1.9rem] leading-none tracking-[0.42em] sm:text-[2.4rem]">LUXER</span>}
          </Link>
          <div className="flex items-center justify-end gap-0.5 sm:gap-1">
            <Link href={logged ? "/conta" : "/conta/entrar"} className="hidden p-2 sm:block" aria-label="Minha conta"><I d={ICON.user} /></Link>
            <Link href="/favoritos" className="p-2" aria-label="Favoritos"><I d={ICON.heart} /></Link>
            <Link href="/carrinho" className="relative p-2" aria-label={`Carrinho com ${cartCount} item(ns)`}>
              <I d={ICON.bag} />
              {cartCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-ink">{cartCount}</span>}
            </Link>
          </div>
        </div>
        <nav className="hidden border-t border-line/70 lg:block" aria-label="Categorias">
          <ul className="mx-auto flex max-w-[1440px] items-center justify-center gap-8 px-8">
            {nav.map((c) => (
              <li key={c.id} onMouseEnter={() => setMega(c.children.length ? c.id : null)}>
                <Link href={`/categoria/${c.slug}`} className={`block py-3.5 text-[11px] uppercase tracking-[0.22em] transition hover:text-gold-2 ${path === `/categoria/${c.slug}` ? "text-gold-2" : ""}`}>{c.name}</Link>
              </li>
            ))}
            <li onMouseEnter={() => setMega(null)}><Link href="/luxer-fe" className="block py-3.5 text-[11px] uppercase tracking-[0.22em] text-gold-2 hover:text-ink">Luxer Fé</Link></li>
            <li onMouseEnter={() => setMega(null)}><Link href="/provador" className="block py-3.5 text-[11px] uppercase tracking-[0.22em] hover:text-gold-2">Provador AI</Link></li>
          </ul>
          {mega && (() => {
            const c = nav.find((x) => x.id === mega)!;
            return (
              <div className="absolute inset-x-0 top-full border-y border-line bg-ivory shadow-[0_30px_60px_-30px_rgba(0,0,0,.25)]">
                <div className="mx-auto grid max-w-[1100px] grid-cols-4 gap-8 px-8 py-10">
                  <div><div className="eyebrow mb-3 text-stone">{c.name}</div><Link href={`/categoria/${c.slug}`} className="font-serif text-2xl hover:text-gold-2">Ver todos</Link></div>
                  <ul className="col-span-3 grid grid-cols-3 gap-x-8 gap-y-3">
                    {c.children.map((s) => <li key={s.id}><Link href={`/categoria/${s.slug}`} className="text-sm text-ink/80 hover:text-gold-2">{s.name}</Link></li>)}
                  </ul>
                </div>
              </div>
            );
          })()}
        </nav>
      </header>

      {search && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" onClick={() => setSearch(false)}>
          <div className="bg-ivory px-4 py-8 sm:px-8 sm:py-14" onClick={(e) => e.stopPropagation()}>
            <form action="/busca" className="mx-auto flex max-w-3xl items-center gap-3 border-b border-ink pb-3">
              <I d={ICON.search} className="h-6 w-6 text-stone" />
              <input name="q" autoFocus placeholder="O que você procura? Ex.: anel solitário, Nossa Senhora, 25438" className="min-w-0 flex-1 bg-transparent font-serif text-xl outline-none placeholder:text-stone/70 sm:text-3xl" />
              <button type="button" onClick={() => setSearch(false)} aria-label="Fechar busca"><I d={ICON.x} /></button>
            </form>
            <div className="mx-auto mt-5 flex max-w-3xl flex-wrap gap-2 text-xs">
              {["Alianças", "Solitário", "Corrente", "Nossa Senhora", "Brinco de pérola", "Pulseira infantil"].map((t) => <Link key={t} href={`/busca?q=${encodeURIComponent(t)}`} className="border border-line px-3 py-1.5 hover:border-gold">{t}</Link>)}
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[86vw] max-w-sm flex-col bg-ivory">
            <div className="flex items-center justify-between border-b border-line px-5 py-4"><span className="font-serif text-2xl tracking-[0.35em]">LUXER</span><button onClick={() => setOpen(false)} aria-label="Fechar menu"><I d={ICON.x} /></button></div>
            <nav className="flex-1 overflow-y-auto px-5 py-4">
              {nav.map((c) => (
                <details key={c.id} className="border-b border-line/70 py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm uppercase tracking-[0.18em]">{c.name}<span className="text-stone">+</span></summary>
                  <ul className="pb-3 pl-2">
                    <li><Link href={`/categoria/${c.slug}`} className="block py-1.5 text-sm text-gold-2">Ver todos</Link></li>
                    {c.children.map((s) => <li key={s.id}><Link href={`/categoria/${s.slug}`} className="block py-1.5 text-sm text-ink/80">{s.name}</Link></li>)}
                  </ul>
                </details>
              ))}
              <Link href="/luxer-fe" className="block border-b border-line/70 py-4 text-sm uppercase tracking-[0.18em] text-gold-2">Luxer Fé</Link>
              <Link href="/provador" className="block border-b border-line/70 py-4 text-sm uppercase tracking-[0.18em]">Provador virtual AI</Link>
              <Link href={logged ? "/conta" : "/conta/entrar"} className="block py-4 text-sm uppercase tracking-[0.18em]">Minha conta</Link>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
