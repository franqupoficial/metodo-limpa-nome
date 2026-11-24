"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";

type P = { id: string; title: string; body: string | null; image: string | null; ctaLabel: string | null; ctaUrl: string | null; couponCode: string | null; collectEmail: boolean; delaySeconds: number; pages: string };

export function Popup({ popup, consentText }: { popup: P | null; consentText: string }) {
  const [show, setShow] = useState(false);
  const path = usePathname();
  useEffect(() => {
    if (!popup) return;
    const match = popup.pages === "all" || (popup.pages === "home" && path === "/") || (popup.pages === "product" && path.startsWith("/produto/")) || (popup.pages === "category" && path.startsWith("/categoria/"));
    if (!match || path.startsWith("/checkout") || path.startsWith("/carrinho")) return;
    let seen = false;
    try { seen = localStorage.getItem(`lx_popup_${popup.id}`) === "1"; } catch {}
    if (seen) return;
    const t = setTimeout(() => {
      setShow(true);
      try { localStorage.setItem(`lx_popup_${popup.id}`, "1"); } catch {}
      fetch("/api/popup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: popup.id, ev: "view" }) }).catch(() => {});
    }, popup.delaySeconds * 1000);
    return () => clearTimeout(t);
  }, [popup, path]);
  if (!popup || !show) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4" onClick={() => setShow(false)}>
      <div role="dialog" aria-modal="true" aria-label={popup.title} className="relative grid w-full max-w-3xl overflow-hidden bg-ivory sm:grid-cols-2" onClick={(e) => e.stopPropagation()}>
        <button className="absolute right-3 top-3 z-10 h-9 w-9 bg-white/80 text-lg" onClick={() => setShow(false)} aria-label="Fechar">×</button>
        {popup.image && <img src={popup.image} alt="" className="hidden h-full w-full object-cover sm:block" />}
        <div className="p-8 sm:p-10">
          <div className="eyebrow text-gold-2">Luxer Joias</div>
          <h2 className="display mt-3 text-3xl">{popup.title}</h2>
          {popup.body && <p className="mt-3 text-sm leading-relaxed text-ink/70">{popup.body}</p>}
          {popup.couponCode && <div className="mt-5 border border-dashed border-gold px-4 py-3 text-center font-mono text-lg tracking-widest">{popup.couponCode}</div>}
          {popup.collectEmail && <div className="mt-5" onSubmit={() => fetch("/api/popup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: popup.id, ev: "conversion" }) })}><NewsletterForm source={`popup:${popup.id}`} consentText={consentText} /></div>}
          {popup.ctaUrl && popup.ctaLabel && <Link href={popup.ctaUrl} onClick={() => setShow(false)} className="btn-gold mt-5">{popup.ctaLabel}</Link>}
        </div>
      </div>
    </div>
  );
}
