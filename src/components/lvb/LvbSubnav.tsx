import Link from "next/link";
import { LvbMark } from "@/components/Logo";

const ITEMS = [
  ["/lvb", "Início"], ["/lvb/veiculos", "Catálogo"], ["/lvb/como-funciona", "Como funciona"], ["/lvb/simulador", "Simulador"],
  ["/lvb/politicas", "Políticas"], ["/lvb/solicitar", "Alugar"],
];

export function LvbSubnav({ current }: { current: string }) {
  return (
    <div className="border-b border-lvb-100 bg-lvb-900">
      <div className="container-portal flex items-center gap-4 overflow-x-auto py-2">
        <Link href="/lvb" aria-label="LVB — Locação de Veículos" className="shrink-0"><LvbMark className="h-7" /></Link>
        <nav aria-label="Seções da LVB">
          <ul className="flex gap-1">
            {ITEMS.map(([href, label]) => (
              <li key={href}>
                <Link href={href} aria-current={current === href ? "page" : undefined} className={`block whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium no-underline ${current === href ? "bg-white/15 text-white" : "text-lvb-100 hover:bg-white/10 hover:text-white"}`}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
