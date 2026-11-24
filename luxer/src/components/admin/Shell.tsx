"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: string; children?: { href: string; label: string }[] };

const ICONS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  tag: "M3 3h8l10 10-8 8L3 11zM7.5 7.5h.01",
  layers: "M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 18l10 5 10-5",
  cart: "M3 4h2l2.4 11h11L21 7H6M9 20h.01M18 20h.01",
  users: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 19v-1a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8",
  coin: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M15 8.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.5 6 4.6 0 1.3-1.3 2.2-3 2.2-1.3 0-2.5-.6-3-1.6M12 5.5v13",
  megaphone: "M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1M17 8a5 5 0 0 1 0 8",
  file: "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8",
  chart: "M3 3v18h18M7 15l4-4 3 3 6-6",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.8-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15.1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9.9 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.8 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.8H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.1",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  menu: "M3 6h18M3 12h18M3 18h18",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3",
  out: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  ext: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3",
};

export function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICONS[name] ?? ICONS.box} />
    </svg>
  );
}

export function Shell({ nav, user, topbar, children }: { nav: NavItem[]; user: { name: string; role: string }; topbar: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  const sidebar = (
    <nav className="flex h-full flex-col bg-[#0b0b0c] text-zinc-300">
      <Link href="/admin" className="flex items-center gap-2 px-5 py-5" onClick={() => setOpen(false)}>
        <span className="font-serif text-2xl tracking-[0.3em] text-[#c9a96e]">LUXER</span>
        <span className="mt-1 text-[9px] uppercase tracking-[0.25em] text-zinc-500">admin</span>
      </Link>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {nav.map((n) => (
          <div key={n.href}>
            <Link
              href={n.href}
              onClick={() => setOpen(false)}
              className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition ${active(n.href) ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"}`}
            >
              <Icon name={n.icon} className={`h-4 w-4 ${active(n.href) ? "text-[#c9a96e]" : "text-zinc-500"}`} />
              {n.label}
            </Link>
            {n.children && active(n.href) && (
              <div className="mb-1 ml-9 border-l border-white/10 pl-2">
                {n.children.map((c) => (
                  <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className={`block rounded px-2 py-1.5 text-[12px] ${path === c.href || path.startsWith(c.href + "/") ? "text-[#e7d8b8]" : "text-zinc-500 hover:text-zinc-200"}`}>
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 px-5 py-4 text-xs">
        <Link href="/admin/conta" onClick={() => setOpen(false)} className="block truncate font-semibold text-zinc-200 hover:text-white">{user.name}</Link>
        <div className="text-zinc-500">{user.role}</div>
      </div>
    </nav>
  );
  return (
    <div className="admin min-h-dvh lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-zinc-200 bg-white/90 px-3 backdrop-blur sm:px-5">
        <div className="lg:hidden"><button className="btn !px-2" onClick={() => setOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button></div>
        {topbar}
      </header>
      <main className="mx-auto min-w-0 max-w-[1400px] overflow-x-clip px-3 py-5 sm:px-6 sm:py-7">{children}</main>
    </div>
  );
}

export function NotificationsBell({ items, unread, onOpen }: { items: { id: string; title: string; body: string | null; link: string | null; at: string; read: boolean }[]; unread: number; onOpen: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="btn relative !px-2"
        aria-label="Notificações"
        onClick={() => {
          setOpen(!open);
          if (!open && unread) void onOpen();
        }}
      >
        <Icon name="bell" />
        {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#c9a96e] px-1.5 text-[10px] font-bold text-black">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="border-b border-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-500">Notificações</div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <div className="px-4 py-6 text-center text-sm text-zinc-500">Nenhuma notificação.</div>}
            {items.map((n) => (
              <Link key={n.id} href={n.link ?? "#"} onClick={() => setOpen(false)} className={`block border-b border-zinc-50 px-4 py-2.5 hover:bg-zinc-50 ${n.read ? "" : "bg-[#fbf7ef]"}`}>
                <div className="text-sm font-medium text-zinc-800">{n.title}</div>
                {n.body && <div className="text-xs text-zinc-500">{n.body}</div>}
                <div className="mt-0.5 text-[10px] text-zinc-400">{n.at}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
