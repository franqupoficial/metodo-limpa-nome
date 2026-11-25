"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./StoreTheme";

type Cat = { id: string; name: string; slug: string; faith: boolean; children: { id: string; name: string; slug: string }[] };

function I({ d, className = "h-[18px] w-[18px]" }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d={d} /></svg>;
}
const ICON = {
  search: "M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15M20.5 20.5l-4.2-4.2",
  user: "M19 20.5v-.8a5.2 5.2 0 0 0-5.2-5.2h-3.6A5.2 5.2 0 0 0 5 19.7v.8M12 11.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6",
  heart: "M12 20s-7-4.4-8.9-8.6C1.7 8.3 3.6 4.8 7 4.8c2 0 3.3 1 4 2.2.7-1.2 2-2.2 4-2.2 3.4 0 5.3 3.5 3.9 6.6C19 15.6 12 20 12 20z",
  bag: "M5.5 8h13l-.9 12.5H6.4zM9 8V6.8a3 3 0 0 1 6 0V8",
  menu: "M3.5 8h17M3.5 16h17",
  x: "M6 6l12 12M18 6 6 18",
};

const SUGGESTIONS = ["Alianças", "Solitário", "Nossa Senhora", "Crucifixo", "Escapulário", "São Bento", "Brinco de pérola", "Corrente"];

export type FaithMenu = { total: number; devotions: { label: string; href: string; count: number }[]; types: { label: string; href: string; count: number }[]; guides: boolean };

export function Header({ cats, cartCount, logo, storeName, logged, faith }: { cats: Cat[]; cartCount: number; logo: string | null; storeName: string; logged: boolean; faith?: FaithMenu }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [mega, setMega] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  const path = usePathname();
  useEffect(() => { setOpen(false); setSearch(false); setMega(null); }, [path]);
  useEffect(() => {
    const on = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      // some ao rolar para baixo e volta ao rolar para cima: o conteúdo respira
      setHidden(y > 240 && y > last.current + 4);
      if (y < last.current - 4 || y <= 240) setHidden(false);
      last.current = y;
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.documentElement.style.overflow = open || search ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [open, search]);
  useEffect(() => {
    if (!open && !search) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setSearch(false); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, search]);
  const nav = cats.filter((c) => !c.faith);
  const active = (slug: string) => path === `/categoria/${slug}` || nav.find((c) => c.slug === slug)?.children.some((s) => path === `/categoria/${s.slug}`);
  const navLink = "relative block py-4 text-[10.5px] uppercase tracking-[0.24em] text-ink/75 transition-colors hover:text-ink after:absolute after:inset-x-0 after:bottom-3 after:h-px after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-500 hover:after:scale-x-100";

  return (
    <>
      <header
        className={`sticky top-0 z-40 bg-ivory/95 backdrop-blur-md transition-[transform,border-color] duration-500 ${scrolled ? "border-b border-line" : "border-b border-transparent"} ${hidden && !mega ? "-translate-y-full" : ""}`}
        onMouseLeave={() => setMega(null)}
      >
        <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-8 lg:h-[76px]">
          <div className="flex items-center">
            <button onClick={() => setOpen(true)} className="-ml-2 p-2 lg:hidden" aria-label="Abrir menu"><I d={ICON.menu} className="h-5 w-5" /></button>
            <button onClick={() => setSearch(true)} className="group flex items-center gap-2.5 p-2 text-ink/75 transition-colors hover:text-ink lg:-ml-2" aria-label="Buscar">
              <I d={ICON.search} />
              <span className="hidden text-[10.5px] uppercase tracking-[0.24em] lg:inline">Buscar</span>
            </button>
          </div>
          <Link href="/" className="flex flex-col items-center" aria-label={`${storeName} — página inicial`}>
            {logo ? <img src={logo} alt={storeName} className="h-7 w-auto sm:h-9" /> : (
              <>
                <span className="font-serif text-[1.7rem] leading-none tracking-[0.46em] [margin-right:-0.46em] sm:text-[2.05rem]">LUXER</span>
                <span className="mt-1 hidden text-[8px] uppercase tracking-[0.62em] [margin-right:-0.62em] text-stone sm:block">Joias</span>
              </>
            )}
          </Link>
          <div className="flex items-center justify-end text-ink/75">
            <ThemeToggle className="hover:text-ink" />
            <Link href={logged ? "/conta" : "/conta/entrar"} className="hidden p-2 transition-colors hover:text-ink sm:block" aria-label="Minha conta"><I d={ICON.user} /></Link>
            <Link href="/favoritos" className="hidden p-2 transition-colors hover:text-ink sm:block" aria-label="Favoritos"><I d={ICON.heart} /></Link>
            <Link href="/carrinho" className="-mr-2 flex items-center gap-1 p-2 transition-colors hover:text-ink" aria-label={`Sacola com ${cartCount} item(ns)`}>
              <I d={ICON.bag} />
              <span className={`min-w-[1ch] text-[11px] tabular-nums ${cartCount ? "text-ink" : "text-transparent"}`}>{cartCount || 0}</span>
            </Link>
          </div>
        </div>
        <nav className="hidden lg:block" aria-label="Categorias">
          <ul className="mx-auto flex max-w-[1440px] items-center justify-center gap-9 px-8">
            {/* especialização: Luxer Fé abre a navegação, com painel de devoções; as demais categorias seguem */}
            <li onMouseEnter={() => setMega(faith?.devotions.length ? "faith" : null)}><Link href="/luxer-fe" className={`${navLink} ${path.startsWith("/luxer-fe") ? "!text-ink after:scale-x-100" : ""}`}>Luxer Fé</Link></li>
            <li aria-hidden className="h-3 w-px bg-line" />
            {nav.map((c) => (
              <li key={c.id} onMouseEnter={() => setMega(c.children.length ? c.id : null)}>
                <Link href={`/categoria/${c.slug}`} className={`${navLink} ${active(c.slug) ? "!text-ink after:scale-x-100" : ""}`}>{c.name}</Link>
              </li>
            ))}
            <li aria-hidden className="h-3 w-px bg-line" />
            <li onMouseEnter={() => setMega(null)}><Link href="/provador" className={`${navLink} ${path === "/provador" ? "!text-ink after:scale-x-100" : ""}`}>Provador</Link></li>
          </ul>
          {mega === "faith" && faith && (
            <div className="absolute inset-x-0 top-full animate-[fade-in_.35s_ease] border-y border-line bg-ivory">
              <div className="mx-auto grid max-w-[1180px] grid-cols-[1.1fr_2fr_1fr] gap-14 px-8 py-12">
                <div>
                  <div className="eyebrow text-stone">Luxer Fé</div>
                  <p className="mt-5 max-w-[15rem] font-serif text-[1.35rem] leading-snug text-ink/85">Joias de devoção em ouro 18k.</p>
                  <Link href="/luxer-fe" className="link-line mt-7">Ver as {faith.total} peças</Link>
                  {faith.guides && <Link href="/guias" className="mt-5 block text-[12px] text-ink/60 underline-offset-4 hover:text-ink hover:underline">Guias e significados</Link>}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-stone">Devoções</div>
                  <ul className="mt-5 grid grid-cols-2 gap-x-10 gap-y-3.5">
                    {faith.devotions.map((d) => <li key={d.href}><Link href={d.href} className="group flex items-baseline justify-between gap-3 font-serif text-[1.15rem] text-ink/85 transition-colors hover:text-ink">{d.label}<span className="font-sans text-[10px] tabular-nums text-stone opacity-0 transition-opacity group-hover:opacity-100">{d.count}</span></Link></li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-stone">Por peça</div>
                  <ul className="mt-5 space-y-3.5">
                    {faith.types.map((d) => <li key={d.href}><Link href={d.href} className="font-serif text-[1.15rem] text-ink/85 transition-colors hover:text-ink">{d.label}</Link></li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {mega && mega !== "faith" && (() => {
            const c = nav.find((x) => x.id === mega)!;
            return (
              <div className="absolute inset-x-0 top-full animate-[fade-in_.35s_ease] border-y border-line bg-ivory">
                <div className="mx-auto grid max-w-[1100px] grid-cols-[1fr_3fr] gap-12 px-8 py-12">
                  <div>
                    <div className="eyebrow text-stone">{c.name}</div>
                    <Link href={`/categoria/${c.slug}`} className="link-line mt-6">Ver todos</Link>
                  </div>
                  <ul className="grid grid-cols-3 gap-x-10 gap-y-4">
                    {c.children.map((s) => <li key={s.id}><Link href={`/categoria/${s.slug}`} className="font-serif text-xl text-ink/85 transition-colors hover:text-ink">{s.name}</Link></li>)}
                  </ul>
                </div>
              </div>
            );
          })()}
        </nav>
      </header>

      {search && (
        <div className="fixed inset-0 z-50 animate-[fade-in_.3s_ease] bg-ink/25" onClick={() => setSearch(false)} role="dialog" aria-modal="true" aria-label="Buscar">
          <div className="bg-ivory px-5 pb-10 pt-6 sm:px-8 sm:pb-16 sm:pt-10" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-8 flex max-w-3xl justify-end"><button type="button" onClick={() => setSearch(false)} className="-mr-2 p-2" aria-label="Fechar busca"><I d={ICON.x} /></button></div>
            <form action="/busca" className="mx-auto flex max-w-3xl items-center gap-4 border-b border-ink/80 pb-4">
              <I d={ICON.search} className="h-5 w-5 shrink-0 text-stone" />
              <input name="q" autoFocus placeholder="Buscar joias, coleções ou referência" className="min-w-0 flex-1 bg-transparent font-serif text-2xl outline-none placeholder:text-stone/60 sm:text-4xl" />
            </form>
            <div className="mx-auto mt-7 max-w-3xl">
              <div className="eyebrow text-stone">Sugestões</div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                {SUGGESTIONS.map((t) => <Link key={t} href={`/busca?q=${encodeURIComponent(t)}`} className="text-sm text-ink/75 underline-offset-4 transition-colors hover:text-ink hover:underline">{t}</Link>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-[fade-in_.3s_ease] bg-ink/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[88vw] max-w-sm animate-[fade-up_.45s_cubic-bezier(.2,.7,.2,1)] flex-col bg-ivory">
            <div className="flex h-16 items-center justify-between px-5">
              <span className="font-serif text-2xl tracking-[0.42em]">LUXER</span>
              <button onClick={() => setOpen(false)} className="-mr-2 p-2" aria-label="Fechar menu"><I d={ICON.x} /></button>
            </div>
            <nav className="flex-1 overflow-y-auto px-5 pb-8 pt-2">
              {faith?.devotions.length ? (
                <details className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-serif text-[1.45rem]">Luxer Fé<span className="text-lg font-light text-stone transition-transform duration-300 group-open:rotate-45">+</span></summary>
                  <ul className="pb-4 pl-1">
                    <li><Link href="/luxer-fe" className="block py-2 text-[13px] text-ink">Todas as {faith.total} peças</Link></li>
                    {faith.devotions.map((d) => <li key={d.href}><Link href={d.href} className="block py-2 text-[13px] text-ink/70">{d.label}</Link></li>)}
                    {faith.guides && <li><Link href="/guias" className="block py-2 text-[13px] text-ink/70">Guias e significados</Link></li>}
                  </ul>
                </details>
              ) : <Link href="/luxer-fe" className="block border-b border-line py-4 font-serif text-[1.45rem]">Luxer Fé</Link>}
              {nav.map((c) => c.children.length ? (
                <details key={c.id} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-serif text-[1.45rem]">{c.name}<span className="text-lg font-light text-stone transition-transform duration-300 group-open:rotate-45">+</span></summary>
                  <ul className="pb-4 pl-1">
                    <li><Link href={`/categoria/${c.slug}`} className="block py-2 text-[13px] text-ink">Ver todos</Link></li>
                    {c.children.map((s) => <li key={s.id}><Link href={`/categoria/${s.slug}`} className="block py-2 text-[13px] text-ink/70">{s.name}</Link></li>)}
                  </ul>
                </details>
              ) : (
                <Link key={c.id} href={`/categoria/${c.slug}`} className="block border-b border-line py-4 font-serif text-[1.45rem]">{c.name}</Link>
              ))}
              <Link href="/provador" className="block border-b border-line py-4 font-serif text-[1.45rem]">Provador virtual</Link>
              <div className="mt-8 space-y-4 text-[11px] uppercase tracking-[0.22em] text-ink/70">
                <Link href={logged ? "/conta" : "/conta/entrar"} className="block">Minha conta</Link>
                <Link href="/favoritos" className="block">Favoritos</Link>
                <Link href="/perguntas-frequentes" className="block">Atendimento</Link>
              </div>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
