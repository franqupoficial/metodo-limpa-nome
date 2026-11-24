"use client";
import { useState } from "react";

export function ShippingCalc({ productId, variantHint }: { productId?: string; variantHint?: string }) {
  const [cep, setCep] = useState("");
  const [res, setRes] = useState<{ options: { id: string; name: string; carrier: string; priceCents: number; days: number }[]; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function calc(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/frete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cep, productId, variantId: variantHint }) }).then((x) => x.json()).catch(() => ({ options: [], error: "Falha de conexão." }));
    setRes(r);
    setBusy(false);
  }
  return (
    <div>
      <form onSubmit={calc} className="flex gap-2">
        <input value={cep} onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2"))} inputMode="numeric" placeholder="Digite seu CEP" aria-label="CEP" className="field" />
        <button disabled={busy || cep.replace(/\D/g, "").length !== 8} className="btn-line !px-5">{busy ? "…" : "Calcular"}</button>
      </form>
      {res && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {res.error && <li className="text-stone">{res.error}</li>}
          {res.options.map((o) => <li key={o.id} className="flex justify-between gap-3"><span>{o.name}{o.carrier && o.carrier !== "Luxer" ? ` · ${o.carrier}` : ""} <span className="text-stone">— até {o.days} dias úteis</span></span><span className="whitespace-nowrap font-medium">{o.priceCents === 0 ? "Grátis" : (o.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></li>)}
        </ul>
      )}
      <a className="mt-2 inline-block text-[11px] text-stone underline" href="https://buscacepinter.correios.com.br/" target="_blank" rel="noopener noreferrer">Não sei meu CEP</a>
    </div>
  );
}
