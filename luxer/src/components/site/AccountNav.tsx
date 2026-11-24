import Link from "next/link";
import { logoutCustomer } from "@/app/(loja)/_actions/account";

export function AccountNav({ current }: { current: string }) {
  const items = [["/conta", "Pedidos"], ["/conta/dados", "Meus dados"], ["/conta/enderecos", "Endereços"], ["/favoritos", "Favoritos"]];
  return (
    <nav className="mb-10 flex flex-wrap items-center gap-6 border-b border-line pb-4 text-[11px] uppercase tracking-[0.2em]">
      {items.map(([h, l]) => <Link key={h} href={h} className={current === h ? "text-gold-2" : "hover:text-gold-2"}>{l}</Link>)}
      <form action={logoutCustomer} className="ml-auto"><button className="uppercase tracking-[0.2em] text-stone hover:text-ink">Sair</button></form>
    </nav>
  );
}
