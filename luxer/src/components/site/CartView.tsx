"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCartItem, applyCoupon } from "@/app/(loja)/_actions/cart";
import { ShippingCalc } from "./ShippingCalc";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type Line = { id: string; slug: string; name: string; option: string | null; optionName: string | null; image: string | null; unitCents: number; quantity: number; totalCents: number; problem: string | null };

export function CartView({ lines, subtotal, discount, coupon, pixSavings, pixPct, inst }: { lines: Line[]; subtotal: number; discount: number; coupon: { code: string; error?: string; freeShipping: boolean } | null; pixSavings: number; pixPct: number; inst: { max: number; value: number } }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) => start(async () => { const r = await fn(); setMsg(r.ok ? null : r.message); router.refresh(); });
  const hasProblem = lines.some((l) => l.problem);
  const total = subtotal - discount;
  return (
    <div className="grid gap-14 lg:grid-cols-[1.6fr_1fr] lg:gap-20">
      <ul className={`divide-y divide-line border-y border-line transition-opacity ${pending ? "opacity-60" : ""}`}>
        {lines.map((l) => (
          <li key={l.id} className="flex gap-5 py-7 sm:gap-7">
            <Link href={`/produto/${l.slug}`} className="h-32 w-[6.4rem] shrink-0 bg-white sm:h-40 sm:w-32">{l.image && <img src={l.image} alt="" className="h-full w-full object-contain p-2" />}</Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-3"><Link href={`/produto/${l.slug}`} className="font-serif text-lg leading-snug transition-colors hover:text-ink/70">{l.name}</Link><span className="whitespace-nowrap text-[13px] tabular-nums">{brl(l.totalCents)}</span></div>
              {l.option && <div className="mt-1 text-xs text-stone">{l.optionName ?? "Opção"}: {l.option}</div>}
              <div className="mt-1 text-xs text-stone">{brl(l.unitCents)} cada</div>
              {l.problem && <div className="mt-1 text-xs font-medium text-red-700">{l.problem}</div>}
              <div className="mt-auto flex items-center gap-4 pt-3">
                <div className="flex items-center border border-line bg-white text-[13px]">
                  <button onClick={() => run(() => updateCartItem(l.id, l.quantity - 1))} className="px-3 py-1.5" aria-label="Diminuir">−</button>
                  <span className="w-6 text-center tabular-nums">{l.quantity}</span>
                  <button onClick={() => run(() => updateCartItem(l.id, l.quantity + 1))} className="px-3 py-1.5" aria-label="Aumentar">+</button>
                </div>
                <button onClick={() => run(() => updateCartItem(l.id, 0))} className="text-[10.5px] uppercase tracking-[0.2em] text-stone underline-offset-4 transition-colors hover:text-ink hover:underline">Remover</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <aside className="h-fit space-y-7 border-t border-ink pt-7 lg:sticky lg:top-28">
        <h2 className="eyebrow text-ink">Resumo</h2>
        <form onSubmit={(e) => { e.preventDefault(); const code = new FormData(e.currentTarget).get("code") as string; run(() => applyCoupon(code)); }} className="flex">
          <input name="code" defaultValue={coupon?.code ?? ""} placeholder="Cupom de desconto" className="field uppercase" aria-label="Cupom" />
          <button className="btn-line !px-5 -ml-px border-line bg-white hover:border-ink">Aplicar</button>
        </form>
        {coupon?.error && <p className="-mt-3 text-xs text-red-700">{coupon.error}</p>}
        {msg && <p className="-mt-3 text-xs text-red-700">{msg}</p>}
        <dl className="space-y-2.5 text-[13px] tabular-nums">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{brl(subtotal)}</dd></div>
          {discount > 0 && <div className="flex justify-between"><dt>Cupom {coupon?.code}</dt><dd>− {brl(discount)}</dd></div>}
          {coupon?.freeShipping && !coupon.error && <div className="flex justify-between"><dt>Cupom {coupon.code}</dt><dd>Frete grátis</dd></div>}
          <div className="flex items-baseline justify-between border-t border-line pt-4"><dt>Total sem frete</dt><dd className="text-xl font-light">{brl(total)}</dd></div>
          {pixSavings > 0 && <div className="text-right text-xs text-ink/65">{brl(total - pixSavings)} no Pix ({pixPct.toLocaleString("pt-BR")}% de desconto)</div>}
          {inst.max > 1 && <div className="text-right text-xs text-stone">ou {inst.max}x de {brl(inst.value)} no cartão</div>}
        </dl>
        <div><div className="eyebrow mb-3 text-stone">Frete</div><ShippingCalc /></div>
        <Link href="/checkout" aria-disabled={hasProblem} className={`btn-gold w-full ${hasProblem ? "pointer-events-none opacity-50" : ""}`}>Finalizar compra</Link>
        {hasProblem && <p className="text-xs text-red-700">Ajuste os itens indisponíveis para continuar.</p>}
        <Link href="/" className="block text-center text-[10.5px] uppercase tracking-[0.22em] text-stone underline-offset-4 transition-colors hover:text-ink hover:underline">Continuar comprando</Link>
      </aside>
    </div>
  );
}
