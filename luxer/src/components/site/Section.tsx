import Link from "next/link";
import type { ReactNode } from "react";
import type React from "react";

/** Cabeçalho de seção editorial: eyebrow discreto, título em serifa, link sublinhado. */
export function SectionHead({ eyebrow, title, subtitle, href, linkLabel = "Ver todos", center = true }: { eyebrow?: string | null; title?: string | null; subtitle?: string | null; href?: string; linkLabel?: string; center?: boolean }) {
  return (
    <div className={`mb-12 sm:mb-16 ${center ? "text-center" : "flex flex-wrap items-end justify-between gap-6"}`}>
      <div>
        {eyebrow && <div data-reveal="fade" className="eyebrow text-stone">{eyebrow}</div>}
        {title && <h2 data-reveal="line" className="display mt-4 text-[2.35rem] sm:text-[3.2rem]">{title}</h2>}
        {subtitle && <p data-reveal style={{ "--i": 2 } as React.CSSProperties} className={`mt-4 text-[14px] leading-relaxed text-ink/60 ${center ? "mx-auto max-w-lg" : "max-w-lg"}`}>{subtitle}</p>}
      </div>
      {href && <Link href={href} className={`link-line text-ink ${center ? "mt-8" : ""}`}>{linkLabel}</Link>}
    </div>
  );
}

/** Título das páginas internas (sacola, checkout, conta, institucionais): mesma hierarquia em todo o site. */
export function PageHeading({ eyebrow, title, text, children, center = false }: { eyebrow?: string; title: string; text?: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <header className={`mb-12 border-b border-line pb-8 sm:mb-14 sm:pb-10 ${center ? "text-center" : ""}`}>
      {eyebrow && <div className="eyebrow text-stone">{eyebrow}</div>}
      <h1 className={`display text-[2.5rem] sm:text-[3.6rem] ${eyebrow ? "mt-4" : ""}`}>{title}</h1>
      {text && <p className={`mt-4 max-w-xl text-[14px] leading-relaxed text-ink/60 ${center ? "mx-auto" : ""}`}>{text}</p>}
      {children}
    </header>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  // largura própria (ex.: max-w-3xl) substitui a largura padrão em vez de competir com ela
  const width = /(^|\s)max-w-/.test(className) ? "" : "max-w-[1440px]";
  return <div className={`mx-auto px-5 sm:px-8 lg:px-12 ${width} ${className}`}>{children}</div>;
}
