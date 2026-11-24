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

  useEffect(() => track("view_item", { currency: "BRL", value: price.price / 100, items: [{ item_id: product.ref ?? product.id, item_name: product.name, price: price.price / 100 }] }), [product, price.price]);

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
      <div className="space-y-1">
        {price.compareAt && <div className="text-sm text-stone line-through">{brl(price.compareAt)}</div>}
        <div className="font-serif text-4xl">{brl(unit)}</div>
        <div className="text-sm"><span className="font-medium text-gold-2">{brl(pix)} no Pix</span> <span className="text-stone">({price.pixPct.toLocaleString("pt-BR")}% de desconto)</span></div>
        {price.installments > 1 && <div className="text-sm text-stone">ou {price.installments}x de {brl(Math.ceil(unit / price.installments))} sem juros no cartão</div>}
      </div>

      {hasOptions && (
        <fieldset className="mt-8">
          <legend className="eyebrow mb-3 flex w-full justify-between text-stone"><span>{optionName ?? "Opção"}{v ? `: ${v.option}` : ""}</span>{sizeGuide && (optionName ?? "").toLowerCase().includes("tamanho") && <Link href="/p/guia-de-tamanhos" className="normal-case tracking-normal underline">Guia de tamanhos</Link>}</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((x) => (
              <button key={x.id} type="button" disabled={x.available <= 0} onClick={() => { setSel(x.id); setMsg(null); }} aria-pressed={sel === x.id}
                className={`min-w-12 border px-3 py-2.5 text-sm transition ${sel === x.id ? "border-ink bg-ink text-gold-soft" : "border-line hover:border-ink"} disabled:cursor-not-allowed disabled:text-stone/50 disabled:line-through`}>
                {x.option}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-8 flex gap-3">
        <div className="flex items-center border border-line">
          <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-3" aria-label="Diminuir">−</button>
          <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{qty}</span>
          <button type="button" onClick={() => setQty(Math.min(10, qty + 1))} className="px-3 py-3" aria-label="Aumentar">+</button>
        </div>
        <button type="button" onClick={() => add(true)} disabled={pending || soldOut} className="btn-gold flex-1">{soldOut ? "Esgotado" : pending ? "Adicionando…" : "Comprar"}</button>
      </div>
      {!soldOut && <button type="button" onClick={() => add(false)} disabled={pending} className="btn-line mt-3 w-full">Adicionar à sacola</button>}
      {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text} {msg.ok && <Link href="/carrinho" className="underline">Ver sacola</Link>}</p>}
      {soldOut && whatsapp && <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Tenho interesse na peça ${product.name}${product.ref ? ` (ref. ${product.ref})` : ""}. Ela volta a ficar disponível?`)}`} target="_blank" rel="noopener noreferrer" className="btn-line mt-3 w-full">Avise-me pelo WhatsApp</a>}
    </div>
  );
}
