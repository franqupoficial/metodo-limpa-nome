import Link from "next/link";
import { logoutCustomer } from "@/app/(loja)/_actions/account";

export function AccountNav({ current }: { current: string }) {
  const items = [["/conta", "Pedidos"], ["/conta/dados", "Meus dados"], ["/conta/enderecos", "Endereços"], ["/favoritos", "Favoritos"]];
  return (
    <nav className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[10.5px] uppercase tracking-[0.22em]">
      {items.map(([h, l]) => <Link key={h} href={h} className={`border-b pb-1 transition-colors ${current === h ? "border-ink text-ink" : "border-transparent text-ink/55 hover:text-ink"}`}>{l}</Link>)}
      <form action={logoutCustomer} className="ml-auto"><button className="pb-1 uppercase tracking-[0.22em] text-stone transition-colors hover:text-ink">Sair</button></form>
    </nav>
  );
}
