"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Icon } from "./Icon";

export const NAV = [
  { href: "/", label: "Página inicial" },
  { href: "/servicos", label: "Serviços" },
  { href: "/consumidor", label: "Consumidor" },
  { href: "/cnpj", label: "Abra seu CNPJ" },
  { href: "/emprestimo", label: "Empréstimo" },
  { href: "/lvb", label: "Locação de veículos" },
  { href: "/informacoes", label: "Informações" },
  { href: "/perguntas-frequentes", label: "Perguntas frequentes" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Ir para o conteúdo
      </a>
      <div className="bg-brand-900 text-[12px] text-brand-100">
        <div className="container-portal flex items-center justify-between gap-3 py-1.5">
          <p className="truncate">Portal privado de serviços digitais — não é um canal do governo.</p>
          <Link href="/acompanhar" className="hidden shrink-0 font-semibold text-white no-underline hover:underline sm:inline">Acompanhar solicitação</Link>
        </div>
      </div>
      <div className="container-portal flex h-16 items-center justify-between gap-4">
        <Logo />
        <div className="flex items-center gap-2">
          <form action="/busca" role="search" className="hidden items-center md:flex">
            <label htmlFor="busca-topo" className="sr-only">Buscar no portal</label>
            <div className="relative">
              <input id="busca-topo" name="q" type="search" placeholder="O que você procura?" className="input w-56 rounded-full py-2 pl-9 text-sm lg:w-64" />
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
          </form>
          <Link href="/acompanhar" className="btn-primary btn-sm hidden sm:inline-flex">
            <Icon name="track" className="h-4 w-4" /> Acompanhar
          </Link>
          <button
            type="button"
            className="btn-ghost p-2 lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "close" : "menu"} className="h-6 w-6" />
            <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
          </button>
        </div>
      </div>
      <nav aria-label="Navegação principal" className="hidden border-t border-line lg:block">
        <ul className="container-portal flex items-center gap-1 overflow-x-auto py-1">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors ${
                  isActive(item.href) ? "bg-brand-50 text-brand-800" : "text-ink hover:bg-surface hover:text-brand-700"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {open && (
        <div id="menu-mobile" className="fixed inset-x-0 bottom-0 top-[calc(4rem+28px)] z-40 overflow-y-auto bg-white lg:hidden">
          <div className="container-portal py-4">
            <form action="/busca" role="search" className="mb-4">
              <label htmlFor="busca-mobile" className="sr-only">Buscar no portal</label>
              <div className="relative">
                <input id="busca-mobile" name="q" type="search" placeholder="Buscar serviços e informações" className="input rounded-full pl-9" />
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
            </form>
            <ul className="divide-y divide-line">
              {[...NAV, { href: "/noticias", label: "Notícias e conteúdos" }, { href: "/acompanhar", label: "Acompanhar solicitação" }, { href: "/contato", label: "Contato" }].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className="flex items-center justify-between py-3.5 text-base font-medium text-ink no-underline">
                    {item.label}
                    <Icon name="chevron" className="h-4 w-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </header>
  );
}
