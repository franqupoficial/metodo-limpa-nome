"use client";
import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Consentimento de cookies (LGPD) + carregamento condicional de GA4, GTM e Meta Pixel.
 * Sem aceite, nenhum script de terceiro é carregado. Os eventos de e-commerce passam por window.lxTrack.
 */
type Ids = { ga4Id: string; gtmId: string; metaPixelId: string };
const KEY = "lx_consent_v1";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...a: unknown[]) => void;
    fbq?: (...a: unknown[]) => void;
    lxTrack?: (event: string, data?: Record<string, unknown>) => void;
  }
}

const FB: Record<string, string> = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase", search: "Search", generate_lead: "Lead" };

export function Consent({ ids }: { ids: Ids }) {
  const [choice, setChoice] = useState<"yes" | "no" | null | "unset">("unset");
  const path = usePathname();
  useEffect(() => {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch {}
    setChoice(v === "yes" || v === "no" ? v : null);
  }, []);
  useEffect(() => {
    window.lxTrack = (event, data = {}) => {
      if (choice !== "yes") return;
      window.dataLayer?.push({ event, ecommerce: data });
      window.gtag?.("event", event, data);
      if (FB[event]) window.fbq?.("track", FB[event], { value: data.value, currency: "BRL", content_ids: data.items ? (data.items as { item_id: string }[]).map((i) => i.item_id) : undefined });
    };
  }, [choice]);
  useEffect(() => {
    if (choice === "yes") {
      window.gtag?.("event", "page_view", { page_path: path });
      window.fbq?.("track", "PageView");
    }
  }, [path, choice]);
  // visitantes únicos por dia (anônimo) para a taxa de conversão
  useEffect(() => {
    fetch("/api/v", { method: "POST", keepalive: true }).catch(() => {});
  }, []);

  const save = (v: "yes" | "no") => {
    try { localStorage.setItem(KEY, v); } catch {}
    setChoice(v);
  };
  const any = ids.ga4Id || ids.gtmId || ids.metaPixelId;
  return (
    <>
      {choice === "yes" && ids.gtmId && <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${ids.gtmId}');`}</Script>}
      {choice === "yes" && ids.ga4Id && <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${ids.ga4Id}`} strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ids.ga4Id}',{send_page_view:false});`}</Script>
      </>}
      {choice === "yes" && ids.metaPixelId && <Script id="fbp" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${ids.metaPixelId}');fbq('track','PageView');`}</Script>}
      {choice === null && any && (
        <div role="dialog" aria-label="Preferências de cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl border border-line bg-ivory p-6 sm:inset-x-6 sm:bottom-6">
          <p className="text-[13px] leading-relaxed text-ink/75">Usamos cookies essenciais para o funcionamento da loja e, com a sua permissão, cookies de medição e publicidade (Google e Meta) para entender o uso do site e personalizar ofertas. <Link href="/privacidade" className="underline underline-offset-4">Saiba mais</Link>.</p>
          <div className="mt-5 flex flex-wrap items-center gap-6"><button onClick={() => save("yes")} className="btn-gold !py-3">Aceitar</button><button onClick={() => save("no")} className="link-line text-ink">Somente essenciais</button></div>
        </div>
      )}
    </>
  );
}

export function track(event: string, data?: Record<string, unknown>) {
  if (typeof window !== "undefined") window.lxTrack?.(event, data);
}
