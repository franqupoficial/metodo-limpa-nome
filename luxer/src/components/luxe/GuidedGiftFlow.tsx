"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Gem, Cake, Gift, Sparkles, ArrowLeft, RotateCcw, MessageCircle } from "lucide-react";
import { addToCart } from "@/app/(loja)/_actions/cart";
import { METALS } from "./three/metals";

type Item = { id: string; name: string; slug: string; ref: string | null; image: string | null; hoverImage: string | null; alt: string; why: string; available: boolean; quickVariantId: string | null; price: { price: number } };
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const I = { strokeWidth: 1.25, className: "h-5 w-5" };

const OCCASION = [
  { k: "noivado", label: "Noivado", sub: "Solitários, alianças e meias-alianças", icon: <Gem {...I} /> },
  { k: "aniversario", label: "Aniversário", sub: "Para celebrar a data", icon: <Cake {...I} /> },
  { k: "presente", label: "Presente especial", sub: "Para alguém extraordinário", icon: <Gift {...I} /> },
  { k: "uso", label: "Uso diário", sub: "Elegância para todos os dias", icon: <Sparkles {...I} /> },
] as const;
const METAL = (["amarelo", "branco", "rose"] as const).map((k) => ({ k, label: METALS[k].label, swatch: METALS[k].swatch }));
const RANGE = [
  { k: "ate-1500", label: "Até R$ 1.500" },
  { k: "1500-4000", label: "R$ 1.500 a R$ 4.000" },
  { k: "4000-10000", label: "R$ 4.000 a R$ 10.000" },
  { k: "acima-10000", label: "Acima de R$ 10.000" },
] as const;
const QUESTIONS = ["Qual é a ocasião?", "Qual metal você prefere?", "Qual faixa de investimento?"];

const enter = { initial: { opacity: 0, y: 18, filter: "blur(4px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: -12, filter: "blur(4px)" }, transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] as const } };

/** Guided Luxury Concierge: três escolhas e uma seleção real do acervo. */
export function GuidedGiftFlow({ whatsapp }: { whatsapp: string }) {
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<{ o?: string; m?: string; f?: string }>({});
  const [items, setItems] = useState<Item[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const restart = () => { setStep(0); setSel({}); setItems(null); setMsg(null); };
  useEffect(() => { window.addEventListener("lx:finder-start", restart); return () => window.removeEventListener("lx:finder-start", restart); }, []);

  const pick = (key: "o" | "m" | "f", v: string) => {
    const next = { ...sel, [key]: v };
    setSel(next);
    if (step < 2) { setStep(step + 1); return; }
    setStep(3); setItems(null);
    fetch(`/api/curadoria?ocasiao=${next.o}&metal=${next.m}&peca=todas&faixa=${next.f}`).then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => setItems([]));
  };
  const label = (k?: string, list: readonly { k: string; label: string }[] = []) => list.find((x) => x.k === k)?.label ?? "";
  const summary = [label(sel.o, OCCASION), label(sel.m, METAL), label(sel.f, RANGE)].filter(Boolean).join(" · ");
  const wa = (it: Item) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Fiz a curadoria no site da Luxer (${summary}). Tenho interesse na joia "${it.name}"${it.ref ? ` (ref. ${it.ref})` : ""}. Pode me ajudar?`)}`;
  const quickBuy = (it: Item) => start(async () => {
    if (!it.quickVariantId) { router.push(`/produto/${it.slug}`); return; }
    const r = await addToCart(it.quickVariantId, 1);
    if (r.ok) router.push("/carrinho"); else setMsg(r.message);
  });

  const option = "group relative flex w-full items-center gap-4 rounded-2xl border border-ink/[0.08] bg-surface px-5 py-5 text-left transition-colors hover:border-gold/50 hover:bg-ink/[0.03]";
  return (
    <div className="text-ink">
      {step < 3 ? (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-20 [&>*]:min-w-0">
          <div>
            <div className="flex items-center gap-3" aria-label={`Etapa ${step + 1} de 3`}>
              {[0, 1, 2].map((i) => <span key={i} className={`h-[2px] w-10 rounded-full transition-colors duration-500 ${i <= step ? "bg-gold" : "bg-ink/10"}`} />)}
              <span className="ml-2 text-[11px] tabular-nums tracking-tight text-stone">{step + 1}/3</span>
            </div>
            <AnimatePresence mode="wait"><motion.h3 key={step} {...enter} className="mt-7 font-serif text-[2.2rem] leading-[1.05] tracking-tight sm:text-[3rem]">{QUESTIONS[step]}</motion.h3></AnimatePresence>
            {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="mt-6 inline-flex items-center gap-2 text-[12px] tracking-tight text-stone hover:text-ink"><ArrowLeft className="h-4 w-4" strokeWidth={1.25} />Voltar</button>}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={step} {...enter} className="grid gap-3 sm:grid-cols-2">
              {step === 0 && OCCASION.map((o) => <button key={o.k} type="button" onClick={() => pick("o", o.k)} className={option}><span className="text-gold">{o.icon}</span><span><span className="block font-serif text-[1.35rem] leading-tight">{o.label}</span><span className="mt-0.5 block text-[12px] tracking-tight text-stone">{o.sub}</span></span></button>)}
              {step === 1 && METAL.map((m) => <button key={m.k} type="button" onClick={() => pick("m", m.k)} className={option}><span className="h-7 w-7 shrink-0 rounded-full ring-1 ring-ink/20" style={{ background: m.swatch }} /><span className="font-serif text-[1.35rem] leading-tight">{m.label}</span></button>)}
              {step === 2 && RANGE.map((r) => <button key={r.k} type="button" onClick={() => pick("f", r.k)} className={option}><span className="font-serif text-[1.35rem] leading-tight tabular-nums">{r.label}</span></button>)}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink/[0.08] pb-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.4em] text-gold">Seleção curada para você</div>
              <h3 className="mt-3 font-serif text-[2.2rem] leading-tight tracking-tight sm:text-[2.8rem]">{label(sel.o, OCCASION)}</h3>
              <p className="mt-2 text-[12px] tracking-tight text-stone">{summary}</p>
            </div>
            <button type="button" onClick={restart} className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-[12px] tracking-tight hover:border-ink/40"><RotateCcw className="h-4 w-4" strokeWidth={1.25} />Refazer curadoria</button>
          </div>
          {!items && <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-ink/[0.04]" />)}</div>}
          {items && items.length === 0 && <p className="mt-10 text-[14px] tracking-tight text-stone">Não encontramos peças nessa combinação agora. <button type="button" onClick={restart} className="text-ink underline underline-offset-4">Refaça a curadoria</button> ou fale com um especialista.</p>}
          {msg && <p className="mt-4 text-[13px] text-red-400">{msg}</p>}
          {items && items.length > 0 && (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it, i) => (
                <motion.article key={it.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }} className="group flex flex-col overflow-hidden rounded-2xl border border-ink/[0.08] bg-surface">
                  <Link href={`/produto/${it.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-white">
                    {it.image && <img src={it.image} alt={it.alt} loading="lazy" className={`absolute inset-0 h-full w-full object-contain p-[8%] transition duration-700 ${it.hoverImage ? "group-hover:opacity-0" : "group-hover:scale-[1.04]"}`} />}
                    {it.hoverImage && <img src={it.hoverImage} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full object-contain p-[8%] opacity-0 transition duration-700 group-hover:opacity-100" />}
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gold">{it.why}</p>
                    <Link href={`/produto/${it.slug}`} className="mt-2 font-serif text-[1.2rem] leading-snug hover:text-ink">{it.name}</Link>
                    <div className="mt-1.5 text-[14px] tabular-nums tracking-tight">{brl(it.price.price)}</div>
                    <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-5">
                      <button type="button" disabled={pending || !it.available} onClick={() => quickBuy(it)} className="rounded-full bg-ink px-5 py-2.5 text-[12px] font-medium tracking-tight text-ivory transition-colors hover:bg-ink-2 disabled:opacity-40">{!it.available ? "Esgotado" : it.quickVariantId ? "Compra rápida" : "Escolher tamanho"}</button>
                      {whatsapp && <a href={wa(it)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12px] tracking-tight text-stone hover:text-ink"><MessageCircle className="h-4 w-4" strokeWidth={1.25} />Tirar dúvidas com especialista</a>}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
