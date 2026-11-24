"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { LogoMark } from "@/components/Logo";

const MENU: { href: string; label: string; icon: string; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/clientes", label: "Clientes", icon: "users" },
  { href: "/admin/consumidor", label: "Consumidor", icon: "shield" },
  { href: "/admin/cnpj", label: "CNPJ", icon: "briefcase" },
  { href: "/admin/emprestimos", label: "Empréstimos", icon: "wallet" },
  { href: "/admin/lvb", label: "LVB", icon: "car" },
  { href: "/admin/veiculos", label: "Veículos", icon: "route" },
  { href: "/admin/tarifas", label: "Tarifas", icon: "tag" },
  { href: "/admin/noticias", label: "Notícias", icon: "news" },
  { href: "/admin/acompanhamento", label: "Acompanhamento", icon: "track" },
  { href: "/admin/configuracoes", label: "Configurações", icon: "settings", adminOnly: true },
  { href: "/admin/seguranca", label: "Segurança", icon: "lock" },
];

export function Sidebar({ name, role, logout }: { name: string; role: string; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Menu do painel" className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <LogoMark className="h-8 w-8" />
        <div className="leading-tight"><p className="text-sm font-extrabold text-white">Portal Consumidor</p><p className="text-[11px] text-brand-200">Painel administrativo</p></div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {MENU.filter((m) => !m.adminOnly || role === "ADMIN").map((m) => (
          <li key={m.href}>
            <Link href={m.href} aria-current={active(m.href) ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${active(m.href) ? "bg-white/15 text-white" : "text-brand-100 hover:bg-white/10 hover:text-white"}`}>
              <Icon name={m.icon} className="h-4.5 w-4.5" /> {m.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-white/10 p-3">
        <p className="truncate px-2 text-xs text-brand-200">{name} · {role === "ADMIN" ? "Administrador" : "Operador"}</p>
        <form action={logout}>
          <button className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-100 hover:bg-white/10 hover:text-white"><Icon name="logout" className="h-4.5 w-4.5" /> Sair</button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-60 bg-brand-900 lg:block">{nav}</aside>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-brand-900 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2 text-white"><LogoMark className="h-7 w-7" /><span className="text-sm font-bold">Painel</span></div>
        <button type="button" className="text-white" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? "close" : "menu"} className="h-6 w-6" /><span className="sr-only">Menu</span></button>
      </div>
      {open && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 w-64 bg-brand-900">{nav}</aside></div>}
    </>
  );
}
