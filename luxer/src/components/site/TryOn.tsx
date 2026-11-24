"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type P = { slug: string; name: string; image: string | null; category: string };
const CAT: Record<string, string> = { colares: "Colares", correntes: "Correntes", pingentes: "Pingentes", brincos: "Brincos", pulseiras: "Pulseiras", aneis: "Anéis" };
const TIP: Record<string, string> = { colares: "uma foto de frente, do rosto ao peito, com o pescoço visível", correntes: "uma foto de frente, mostrando o pescoço e o colo", pingentes: "uma foto de frente, do rosto ao peito", brincos: "uma foto do rosto, com a orelha visível (cabelo preso)", pulseiras: "uma foto do pulso, bem iluminada", aneis: "uma foto da mão aberta, com os dedos visíveis" };

async function downscale(f: File): Promise<Blob> {
  const bmp = await createImageBitmap(f);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/jpeg", 0.9));
}

export function TryOn({ products, initial, consentText, disclaimer }: { products: P[]; initial?: string; consentText: string; disclaimer: string }) {
  const [cat, setCat] = useState(products.find((p) => p.slug === initial)?.category ?? products[0]?.category ?? "");
  const [sel, setSel] = useState<string>(initial && products.some((p) => p.slug === initial) ? initial : "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ image: string; disclaimer: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cats = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const list = products.filter((p) => p.category === cat);
  const chosen = products.find((p) => p.slug === sel);
  useEffect(() => {
    if (!file) return setPreview(null);
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function run() {
    if (!file || !sel || !consent) return;
    setBusy(true); setError(null); setResult(null);
    const fd = new FormData();
    // reduz no navegador (máx. 1600 px) para envio rápido e dentro do limite do servidor
    const small = await downscale(file).catch(() => file);
    fd.set("photo", small, "foto.jpg"); fd.set("product", sel); fd.set("consent", "true");
    const r = await fetch("/api/tryon", { method: "POST", body: fd }).then((x) => x.json()).catch(() => ({ ok: false, error: "Falha de conexão." }));
    setBusy(false);
    if (r.ok) setResult({ image: r.image, disclaimer: r.disclaimer });
    else setError(r.error);
  }

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <div className="space-y-10">
        <section>
          <div className="eyebrow mb-4 text-gold-2">1 · Escolha a joia</div>
          <div className="mb-4 flex flex-wrap gap-2">{cats.map((c) => <button key={c} type="button" onClick={() => { setCat(c); setSel(""); }} className={`border px-4 py-2 text-[11px] uppercase tracking-[0.18em] ${cat === c ? "border-ink bg-ink text-gold-soft" : "border-line"}`}>{CAT[c] ?? c}</button>)}</div>
          <div className="grid max-h-[420px] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
            {list.map((p) => <button key={p.slug} type="button" onClick={() => setSel(p.slug)} aria-pressed={sel === p.slug} className={`text-left ${sel === p.slug ? "ring-2 ring-gold" : ""}`}><div className="aspect-square bg-sand">{p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover mix-blend-multiply" />}</div><div className="mt-1 line-clamp-2 p-1 text-[11px] leading-snug">{p.name}</div></button>)}
          </div>
        </section>
        <section>
          <div className="eyebrow mb-4 text-gold-2">2 · Envie sua foto</div>
          {chosen && <p className="mb-3 text-sm text-stone">Para melhor resultado, use {TIP[chosen.category]}.</p>}
          <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-stone/60 bg-white p-8 text-center text-sm hover:border-gold">
            {preview ? <img src={preview} alt="Sua foto" className="max-h-64 object-contain" /> : <span>Toque para escolher ou tirar uma foto<br /><span className="text-xs text-stone">JPG, PNG ou WebP · até 10 MB</span></span>}
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <label className="mt-4 flex items-start gap-2 text-xs leading-snug"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" /> {consentText} <Link href="/privacidade" className="underline">Privacidade</Link></label>
          <button type="button" onClick={run} disabled={!file || !sel || !consent || busy} className="btn-gold mt-5 w-full">{busy ? "Gerando simulação… (até 1 minuto)" : "Experimentar"}</button>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        </section>
      </div>
      <section className="lg:sticky lg:top-36 lg:self-start">
        <div className="eyebrow mb-4 text-gold-2">3 · Resultado</div>
        <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-ink">
          {result ? <img src={result.image} alt="Simulação da joia em você" className="h-full w-full object-contain" /> : busy ? <div className="animate-pulse font-serif text-2xl tracking-[0.3em] text-gold/70">LUXER AI</div> : <div className="px-10 text-center font-serif text-xl text-ivory/50">Sua simulação aparecerá aqui</div>}
        </div>
        {result && <>
          <p className="mt-3 text-[11px] text-stone">{result.disclaimer || disclaimer}</p>
          <div className="mt-4 flex gap-3"><a href={result.image} download="luxer-tryon.webp" className="btn-line flex-1">Salvar imagem</a>{chosen && <Link href={`/produto/${chosen.slug}`} className="btn-gold flex-1">Ver a peça</Link>}</div>
        </>}
      </section>
    </div>
  );
}
