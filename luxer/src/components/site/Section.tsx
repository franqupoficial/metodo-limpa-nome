import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHead({ eyebrow, title, subtitle, href, linkLabel = "Ver todos", center = true }: { eyebrow?: string | null; title?: string | null; subtitle?: string | null; href?: string; linkLabel?: string; center?: boolean }) {
  return (
    <div className={`mb-10 sm:mb-14 ${center ? "text-center" : "flex flex-wrap items-end justify-between gap-4"}`}>
      <div>
        {eyebrow && <div className="eyebrow text-gold-2">{eyebrow}</div>}
        {title && <h2 className="display mt-3 text-4xl sm:text-5xl">{title}</h2>}
        {subtitle && <p className={`mt-3 text-sm text-stone ${center ? "mx-auto max-w-xl" : ""}`}>{subtitle}</p>}
      </div>
      {href && <Link href={href} className={`text-[11px] uppercase tracking-[0.24em] underline-offset-8 hover:text-gold-2 hover:underline ${center ? "mt-6 inline-block" : ""}`}>{linkLabel} →</Link>}
    </div>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1440px] px-5 sm:px-8 ${className}`}>{children}</div>;
}
