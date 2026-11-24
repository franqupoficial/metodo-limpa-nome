import Link from "next/link";
import { Icon } from "./Icon";
import type { ServiceMeta } from "@/lib/services";

export function ServiceCard({ s, cta = "Acessar serviço" }: { s: ServiceMeta; cta?: string }) {
  const lvb = s.type === "LVB";
  return (
    <article className="card-hover group relative flex h-full flex-col p-6">
      <span className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${lvb ? "bg-lvb-50 text-lvb-700" : "bg-brand-50 text-brand-700"}`}>
        <Icon name={s.icon} className="h-6 w-6" />
      </span>
      <h3 className="text-lg font-bold leading-snug">
        <Link href={s.href} className="text-ink no-underline after:absolute after:inset-0 group-hover:text-brand-700">{s.name}</Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.description}</p>
      <span className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold ${lvb ? "text-lvb-700" : "text-brand-700"}`}>
        {cta} <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </article>
  );
}
