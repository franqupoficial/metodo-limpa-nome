import Link from "next/link";
import React from "react";
import { Icon, type IconName } from "./Icon";

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Você está aqui" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        <li><Link href="/" className="text-muted no-underline hover:text-brand-700"><Icon name="home" className="inline h-3.5 w-3.5" /><span className="sr-only">Página inicial</span></Link></li>
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            <Icon name="chevron" className="h-3 w-3" />
            {it.href ? <Link href={it.href} className="text-muted no-underline hover:text-brand-700">{it.label}</Link> : <span aria-current="page" className="font-medium text-ink">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHero({
  eyebrow, title, subtitle, crumbs, children, tone = "brand",
}: {
  eyebrow?: string; title: string; subtitle?: string; crumbs?: { href?: string; label: string }[]; children?: React.ReactNode; tone?: "brand" | "lvb";
}) {
  const bg = tone === "lvb" ? "from-lvb-50 via-white to-white" : "from-brand-50 via-white to-white";
  return (
    <section className={`border-b border-line bg-gradient-to-b ${bg}`}>
      <div className="container-portal py-8 sm:py-12">
        {crumbs && <Breadcrumbs items={crumbs} />}
        <div className="mt-4 max-w-3xl animate-fade-up">
          {eyebrow && <p className={`eyebrow ${tone === "lvb" ? "text-lvb-600" : ""}`}>{eyebrow}</p>}
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-3 text-lg text-muted">{subtitle}</p>}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warn" | "success" | "danger"; title?: string; children: React.ReactNode }) {
  const map = {
    info: ["border-brand-200 bg-brand-50 text-brand-900", "info"],
    warn: ["border-amber-300 bg-amber-50 text-amber-950", "alert"],
    success: ["border-emerald-300 bg-emerald-50 text-emerald-950", "check"],
    danger: ["border-red-300 bg-red-50 text-red-950", "alert"],
  } as const;
  const [cls, icon] = map[tone];
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm leading-relaxed ${cls}`} role={tone === "danger" ? "alert" : "note"}>
      <Icon name={icon} className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {title && <p className="mb-1 font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function Section({ id, title, eyebrow, intro, children, className = "" }: { id?: string; title?: string; eyebrow?: string; intro?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-32 py-10 sm:py-14 ${className}`}>
      <div className="container-portal">
        {(title || eyebrow) && (
          <div className="mb-8 max-w-3xl">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 className="section-title mt-1">{title}</h2>}
            {intro && <p className="mt-2 text-muted">{intro}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function Faq({ items, tone = "brand" }: { items: { q: string; a: string }[]; tone?: "brand" | "lvb" }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
      {items.map((it, i) => (
        <details key={i} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink transition-colors hover:bg-surface [&::-webkit-details-marker]:hidden">
            {it.q}
            <Icon name="chevronDown" className={`h-5 w-5 shrink-0 transition-transform group-open:rotate-180 ${tone === "lvb" ? "text-lvb-600" : "text-brand-600"}`} />
          </summary>
          <div className="px-5 pb-5 text-[15px] leading-relaxed text-muted">{it.a}</div>
        </details>
      ))}
    </div>
  );
}

export function Steps({ steps, tone = "brand" }: { steps: { title: string; text: string }[]; tone?: "brand" | "lvb" }) {
  const c = tone === "lvb" ? "bg-lvb-600" : "bg-brand-700";
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {steps.map((s, i) => (
        <li key={i} className="card relative p-5">
          <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${c}`}>{i + 1}</span>
          <h3 className="font-semibold">{s.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function InfoCard({ icon, title, children, href }: { icon: IconName; title: string; children: React.ReactNode; href?: string }) {
  const inner = (
    <>
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon name={icon} /></span>
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-1 text-sm leading-relaxed text-muted">{children}</div>
    </>
  );
  return href ? <Link href={href} className="card-hover block p-5 no-underline">{inner}</Link> : <div className="card p-5">{inner}</div>;
}

export function StatusBadge({ label, tone }: { label: string; tone: "gray" | "blue" | "amber" | "green" | "red" }) {
  const map = {
    gray: "bg-slate-100 text-slate-700",
    blue: "bg-brand-100 text-brand-800",
    amber: "bg-amber-100 text-amber-900",
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-800",
  };
  return <span className={`badge ${map[tone]}`}>{label}</span>;
}
