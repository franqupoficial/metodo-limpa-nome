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
    <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
      <ul className={`divide-y divide-line border-y border-line ${pending ? "opacity-60" : ""}`}>
        {lines.map((l) => (
          <li key={l.id} className="flex gap-5 py-6">
            <Link href={`/produto/${l.slug}`} className="h-28 w-28 shrink-0 bg-sand">{l.image && <img src={l.image} alt="" className="h-full w-full object-cover mix-blend-multiply" />}</Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-3"><Link href={`/produto/${l.slug}`} className="font-serif text-lg leading-snug hover:text-gold-2">{l.name}</Link><span className="whitespace-nowrap text-sm">{brl(l.totalCents)}</span></div>
              {l.option && <div className="mt-1 text-xs text-stone">{l.optionName ?? "Opção"}: {l.option}</div>}
              <div className="mt-1 text-xs text-stone">{brl(l.unitCents)} cada</div>
              {l.problem && <div className="mt-1 text-xs font-medium text-red-700">{l.problem}</div>}
              <div className="mt-auto flex items-center gap-4 pt-3">
                <div className="flex items-center border border-line text-sm">
                  <button onClick={() => run(() => updateCartItem(l.id, l.quantity - 1))} className="px-3 py-1.5" aria-label="Diminuir">−</button>
                  <span className="w-6 text-center tabular-nums">{l.quantity}</span>
                  <button onClick={() => run(() => updateCartItem(l.id, l.quantity + 1))} className="px-3 py-1.5" aria-label="Aumentar">+</button>
                </div>
                <button onClick={() => run(() => updateCartItem(l.id, 0))} className="text-xs uppercase tracking-[0.15em] text-stone underline">Remover</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <aside className="h-fit space-y-6 bg-sand p-7 lg:sticky lg:top-36">
        <h2 className="display text-2xl">Resumo</h2>
        <form onSubmit={(e) => { e.preventDefault(); const code = new FormData(e.currentTarget).get("code") as string; run(() => applyCoupon(code)); }} className="flex gap-2">
          <input name="code" defaultValue={coupon?.code ?? ""} placeholder="Cupom de desconto" className="field uppercase" aria-label="Cupom" />
          <button className="btn-line !px-4">Aplicar</button>
        </form>
        {coupon?.error && <p className="-mt-3 text-xs text-red-700">{coupon.error}</p>}
        {msg && <p className="-mt-3 text-xs text-red-700">{msg}</p>}
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{brl(subtotal)}</dd></div>
          {discount > 0 && <div className="flex justify-between text-emerald-800"><dt>Cupom {coupon?.code}</dt><dd>− {brl(discount)}</dd></div>}
          {coupon?.freeShipping && !coupon.error && <div className="flex justify-between text-emerald-800"><dt>Cupom {coupon.code}</dt><dd>Frete grátis</dd></div>}
          <div className="flex justify-between border-t border-line pt-3 text-base"><dt>Total sem frete</dt><dd className="font-medium">{brl(total)}</dd></div>
          {pixSavings > 0 && <div className="text-right text-xs text-gold-2">{brl(total - pixSavings)} no Pix ({pixPct.toLocaleString("pt-BR")}% de desconto)</div>}
          {inst.max > 1 && <div className="text-right text-xs text-stone">ou {inst.max}x de {brl(inst.value)} no cartão</div>}
        </dl>
        <div><div className="eyebrow mb-2 text-stone">Frete</div><ShippingCalc /></div>
        <Link href="/checkout" aria-disabled={hasProblem} className={`btn-gold w-full ${hasProblem ? "pointer-events-none opacity-50" : ""}`}>Finalizar compra</Link>
        {hasProblem && <p className="text-xs text-red-700">Ajuste os itens indisponíveis para continuar.</p>}
        <Link href="/" className="block text-center text-[11px] uppercase tracking-[0.2em] underline">Continuar comprando</Link>
      </aside>
    </div>
  );
}
