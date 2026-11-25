"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addToCart } from "@/app/(loja)/_actions/cart";
import { track } from "./Consent";

type V = { id: string; option: string | null; available: number; priceCents: number | null };
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function BuyBox({ product, variants, optionName, price, whatsapp, sizeGuide = false }: {
  sizeGuide?: boolean;
  product: { id: string; name: string; ref: string | null; slug: string };
  variants: V[];
  optionName: string | null;
  price: { price: number; compareAt: number | null; pix: number; installments: number; installmentValue: number; pixPct: number };
  whatsapp: string;
}) {
  const hasOptions = variants.some((v) => v.option);
  const [sel, setSel] = useState<string | null>(hasOptions ? null : variants[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const v = variants.find((x) => x.id === sel);
  const unit = v?.priceCents ?? price.price;
  const pix = v?.priceCents ? Math.round(v.priceCents * (1 - price.pixPct / 100)) : price.pix;
  const soldOut = variants.every((x) => x.available <= 0);

  useEffect(() => { track("view_item", { currency: "BRL", value: price.price / 100, items: [{ item_id: product.ref ?? product.id, item_name: product.name, price: price.price / 100 }] }); }, [product, price.price]);

  function add(goCheckout: boolean) {
    if (!sel) return setMsg({ ok: false, text: `Escolha ${optionName ? `o ${optionName.toLowerCase()}` : "uma opção"}.` });
    start(async () => {
      const r = await addToCart(sel, qty);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) {
        track("add_to_cart", { currency: "BRL", value: (unit * qty) / 100, items: [{ item_id: product.ref ?? product.id, item_name: product.name, item_variant: v?.option ?? undefined, price: unit / 100, quantity: qty }] });
        router.refresh();
        if (goCheckout) router.push("/carrinho");
      }
    });
  }

  return (
    <div>
      <div>
        <div className="flex items-baseline gap-3 tabular-nums">
          <span className="text-[1.6rem] font-light tracking-tight">{brl(unit)}</span>
          {price.compareAt && <span className="text-sm text-stone line-through">{brl(price.compareAt)}</span>}
        </div>
        <div className="mt-2 space-y-0.5 text-[13px] text-ink/65">
          <div>{brl(pix)} no Pix <span className="text-stone">· {price.pixPct.toLocaleString("pt-BR")}% de desconto</span></div>
          {price.installments > 1 && <div>ou {price.installments}x de {brl(Math.ceil(unit / price.installments))} sem juros no cartão</div>}
        </div>
      </div>

      {hasOptions && (
        <fieldset className="mt-8">
          <legend className="eyebrow mb-4 flex w-full justify-between text-stone"><span>{optionName ?? "Opção"}{v ? `: ${v.option}` : ""}</span>{sizeGuide && (optionName ?? "").toLowerCase().includes("tamanho") && <Link href="/p/guia-de-tamanhos" className="normal-case tracking-normal underline">Guia de tamanhos</Link>}</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((x) => (
              <button key={x.id} type="button" disabled={x.available <= 0} onClick={() => { setSel(x.id); setMsg(null); }} aria-pressed={sel === x.id}
                className={`h-11 min-w-11 border px-3 text-[13px] tabular-nums transition-colors ${sel === x.id ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:border-ink"} disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-stone/45 disabled:line-through`}>
                {x.option}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-8 flex gap-3">
        <div className="flex items-center border border-line bg-white">
          <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="h-full px-3.5 text-stone transition-colors hover:text-ink" aria-label="Diminuir">−</button>
          <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{qty}</span>
          <button type="button" onClick={() => setQty(Math.min(10, qty + 1))} className="h-full px-3.5 text-stone transition-colors hover:text-ink" aria-label="Aumentar">+</button>
        </div>
        <button type="button" onClick={() => add(true)} disabled={pending || soldOut} className="btn-gold flex-1">{soldOut ? "Esgotado" : pending ? "Adicionando…" : "Comprar"}</button>
      </div>
      {!soldOut && <button type="button" onClick={() => add(false)} disabled={pending} className="btn-line mt-3 w-full">Adicionar à sacola</button>}
      {msg && <p role="status" className={`mt-4 text-[13px] ${msg.ok ? "text-ink" : "text-red-700"}`}>{msg.text} {msg.ok && <Link href="/carrinho" className="underline underline-offset-4">Ver sacola</Link>}</p>}
      {soldOut && whatsapp && <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Tenho interesse na peça ${product.name}${product.ref ? ` (ref. ${product.ref})` : ""}. Ela volta a ficar disponível?`)}`} target="_blank" rel="noopener noreferrer" className="btn-line mt-3 w-full">Avise-me pelo WhatsApp</a>}
    </div>
  );
}
