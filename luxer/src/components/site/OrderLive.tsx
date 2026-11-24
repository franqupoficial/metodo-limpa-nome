"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "./Consent";

/** Copia o código Pix, atualiza a página enquanto aguarda pagamento e envia o evento de compra uma única vez. */
export function PixCopy({ code }: { code: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div>
      <textarea readOnly value={code} rows={3} className="field font-mono text-[11px]" onFocus={(e) => e.currentTarget.select()} aria-label="Código Pix copia e cola" />
      <button type="button" onClick={async () => { await navigator.clipboard.writeText(code).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 2500); }} className="btn-gold mt-3 w-full">{ok ? "Código copiado ✓" : "Copiar código Pix"}</button>
    </div>
  );
}

export function AutoRefresh({ active, seconds = 8 }: { active: boolean; seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [active, seconds, router]);
  return null;
}

export function PurchaseEvent({ id, paid, value, shipping, items }: { id: string; paid: boolean; value: number; shipping: number; items: { item_id: string; item_name: string; price: number; quantity: number }[] }) {
  useEffect(() => {
    if (!paid) return;
    const k = `lx_purchase_${id}`;
    try {
      if (localStorage.getItem(k)) return;
      localStorage.setItem(k, "1");
    } catch {}
    track("purchase", { transaction_id: id, currency: "BRL", value, shipping, items });
  }, [id, paid, value, shipping, items]);
  return null;
}
