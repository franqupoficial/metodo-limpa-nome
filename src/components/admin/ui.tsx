import Link from "next/link";
import React from "react";
import { Icon } from "@/components/Icon";

export function AdminHeader({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-muted no-underline hover:text-brand-700">← {back.label}</Link>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, children, actions, className = "" }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 className="text-sm font-bold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, href, icon, tone = "brand" }: { label: string; value: number | string; href?: string; icon?: string; tone?: "brand" | "amber" | "green" | "red" | "gray" | "lvb" }) {
  const tones = { brand: "bg-brand-50 text-brand-700", amber: "bg-amber-50 text-amber-700", green: "bg-emerald-50 text-emerald-700", red: "bg-red-50 text-red-700", gray: "bg-slate-100 text-slate-700", lvb: "bg-lvb-50 text-lvb-700" };
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        {icon && <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}><Icon name={icon} className="h-4 w-4" /></span>}
      </div>
      <p className="mt-2 text-2xl font-extrabold text-ink">{value}</p>
    </>
  );
  return href ? <Link href={href} className="card-hover block p-4 no-underline">{inner}</Link> : <div className="card p-4">{inner}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted">{children}</p>;
}

export function Pagination({ page, pages, makeHref }: { page: number; pages: number; makeHref: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted">Página {page} de {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={makeHref(page - 1)} className="btn-secondary btn-sm">Anterior</Link>}
        {page < pages && <Link href={makeHref(page + 1)} className="btn-secondary btn-sm">Próxima</Link>}
      </div>
    </nav>
  );
}

export function Labeled({ label, children, hint, className = "" }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

export function DefList({ rows, cols = 2 }: { rows: [string, React.ReactNode][]; cols?: 2 | 3 }) {
  return (
    <dl className={`grid gap-x-6 gap-y-3 text-sm ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-muted">{k}</dt>
          <dd className="break-words font-medium">{v === "" || v == null ? "—" : v}</dd>
        </div>
      ))}
    </dl>
  );
}
