import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && <Link href={back.href} className="mb-1 inline-block text-xs font-medium text-zinc-500 hover:text-zinc-800">← {back.label}</Link>}
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  gray: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  gold: "bg-[#f7f0e2] text-[#7a5d27] ring-[#e7d8b8]",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONES[tone]}`}>{children}</span>;
}

export function Card({ title, actions, children, className = "", pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`card min-w-0 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
          {actions}
        </div>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, delta, href }: { label: string; value: ReactNode; hint?: ReactNode; delta?: number | null; href?: string }) {
  const body = (
    <div className="card h-full p-4">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
        {delta != null && Number.isFinite(delta) && (
          <span className={delta >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1).replace(".", ",")}%
          </span>
        )}
        {hint}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="text-sm font-semibold text-zinc-700">{title}</div>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

export function Pagination({ page, pages, total, makeHref }: { page: number; pages: number; total: number; makeHref: (p: number) => string }) {
  if (pages <= 1) return <div className="px-4 py-3 text-xs text-zinc-500">{total} registro(s)</div>;
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 text-xs text-zinc-500">
      <span>{total} registro(s) · página {page} de {pages}</span>
      <div className="flex gap-1">
        {page > 1 && <Link className="btn" href={makeHref(page - 1)}>Anterior</Link>}
        {page < pages && <Link className="btn" href={makeHref(page + 1)}>Próxima</Link>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="lbl">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

export function Alert({ tone = "amber", children }: { tone?: "amber" | "red" | "green" | "blue"; children: ReactNode }) {
  const c = { amber: "border-amber-200 bg-amber-50 text-amber-900", red: "border-red-200 bg-red-50 text-red-800", green: "border-emerald-200 bg-emerald-50 text-emerald-900", blue: "border-sky-200 bg-sky-50 text-sky-900" }[tone];
  return <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${c}`}>{children}</div>;
}

/** Monta query string preservando filtros. */
export function qs(base: Record<string, string | undefined>, patch: Record<string, string | number | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
