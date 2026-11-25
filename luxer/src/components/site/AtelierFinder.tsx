"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { addToCart } from "@/app/(loja)/_actions/cart";

type Item = { id: string; name: string; slug: string; ref: string | null; image: string | null; why: string; tryOn: boolean; quickVariantId: string | null; available: boolean; price: { price: number; pix: number; installments: number; installmentValue: number } };
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STEPS = [
  { key: "ocasiao", q: "Para qual história estamos escolhendo?", opts: [["presente", "Presente inesquecível", "Para alguém que merece o extraordinário"], ["uso", "Uso pessoal & sofisticação", "Uma joia para acompanhar o seu dia"], ["noivado", "Noivado & celebração", "Solitários, alianças e meias-alianças"], ["fe", "Fé & proteção", "Nossa Senhora, crucifixos, medalhas"]] },
  { key: "metal", q: "Qual acabamento traduz esse estilo?", opts: [["amarelo", "Ouro Amarelo 18k", "Clássico, luminoso, atemporal"], ["branco", "Ouro Branco 18k", "Contemporâneo e discreto"], ["rose", "Ouro Rosé", "Delicado e romântico"], ["todos", "Quero ver todos", "Sem preferência de acabamento"]] },
  { key: "peca", q: "Qual peça você procura?", opts: [["aneis", "Anéis", "Solitários, alianças, anéis com pedra"], ["brincos", "Brincos", "Argolas, pontos de luz, pérolas"], ["colares", "Colares & pingentes", "Correntes, colares e medalhas"], ["pulseiras", "Pulseiras", "Pulseiras, braceletes e tornozeleiras"], ["todas", "Ver curadoria completa", "Uma seleção entre todas as categorias"]] },
] as const;
const LABEL: Record<string, string> = Object.fromEntries(STEPS.flatMap((s) => s.opts.map(([k, l]) => [k, l])));

export function AtelierFinder({ whatsapp, compact = false, onDone }: { whatsapp: string; compact?: boolean; onDone?: () => void }) {
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const panel = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const animateIn = () => {
    if (!panel.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(panel.current.querySelectorAll(".af-anim"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.06 });
  };
  useEffect(() => { animateIn(); }, [step, items]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const go = () => { setStep(0); setSel({}); setItems(null); };
    window.addEventListener("lx:finder-start", go);
    return () => window.removeEventListener("lx:finder-start", go);
  }, []);

  const choose = (key: string, val: string) => {
    const next = { ...sel, [key]: val };
    setSel(next);
    const outro = () => {
      if (step < 2) setStep(step + 1);
      else {
        setStep(3);
        setLoading(true);
        fetch(`/api/curadoria?ocasiao=${next.ocasiao}&metal=${next.metal}&peca=${next.peca}`).then((r) => r.json()).then((d) => setItems(d.items ?? [])).catch(() => setItems([])).finally(() => setLoading(false));
      }
    };
    if (panel.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.to(panel.current.querySelectorAll(".af-anim"), { opacity: 0, y: -8, duration: 0.3, ease: "power2.in", stagger: 0.02, onComplete: outro });
    else outro();
  };
  const restart = () => { setStep(0); setSel({}); setItems(null); setMsg(null); };
  const quickBuy = (it: Item) => start(async () => {
    if (!it.quickVariantId) { router.push(`/produto/${it.slug}`); return; }
    const r = await addToCart(it.quickVariantId, 1);
    if (r.ok) { onDone?.(); router.push("/carrinho"); } else setMsg(r.message);
  });
  const wa = (it: Item) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Fiz a curadoria no site da Luxer — ocasião: ${LABEL[sel.ocasiao]}, acabamento: ${LABEL[sel.metal]}. Tenho interesse na joia "${it.name}"${it.ref ? ` (ref. ${it.ref})` : ""}. Pode me ajudar?`)}`;

  const s = STEPS[Math.min(step, 2)];
  return (
    <div ref={panel} className={`relative text-ink ${compact ? "" : "mx-auto max-w-6xl"}`}>
      {step < 3 ? (
        <div className={compact ? "" : "grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-20"}>
          <div>
            <div className="af-anim flex items-center gap-4 text-[10px] uppercase tracking-[0.28em] text-stone">
              <span className="tabular-nums text-ink">0{step + 1}</span>
              <span className="relative h-px w-16 bg-line"><span className="absolute inset-y-0 left-0 bg-ink transition-[width] duration-700" style={{ width: `${((step + 1) / 3) * 100}%` }} /></span>
              <span className="tabular-nums">03</span>
            </div>
            <h3 className={`af-anim display mt-6 ${compact ? "text-[1.7rem]" : "text-[2.1rem] sm:text-[2.9rem]"}`}>{s.q}</h3>
            {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="af-anim mt-6 text-[10.5px] uppercase tracking-[0.22em] text-stone transition-colors hover:text-ink">Voltar</button>}
          </div>
          <div className={`border-t border-line ${compact ? "mt-6" : ""}`}>
            {s.opts.map(([k, l, d]) => (
              <button key={k} type="button" onClick={() => choose(s.key, k)} className="af-anim group flex w-full items-center justify-between gap-6 border-b border-line py-5 text-left transition-colors sm:py-6">
                <span>
                  <span className={`block font-serif leading-tight text-ink transition-transform duration-500 group-hover:translate-x-1.5 ${compact ? "text-xl" : "text-[1.45rem] sm:text-[1.7rem]"}`}>{l}</span>
                  <span className="mt-1 block text-[12px] text-stone">{d}</span>
                </span>
                <span aria-hidden className="h-px w-6 shrink-0 bg-ink/25 transition-all duration-500 group-hover:w-10 group-hover:bg-gold" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="af-anim flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
            <div>
              <div className="eyebrow text-stone">Seleção curada para você</div>
              <h3 className={`display mt-3 ${compact ? "text-[1.7rem]" : "text-[2.1rem] sm:text-[2.9rem]"}`}>{LABEL[sel.ocasiao]}</h3>
              <p className="mt-2 text-[12px] text-stone">{LABEL[sel.metal]} · {LABEL[sel.peca]}</p>
            </div>
            <button type="button" onClick={restart} className="link-line text-ink">Refazer curadoria</button>
          </div>
          {loading && <div className="af-anim mt-10 animate-pulse font-serif text-xl text-stone">Selecionando peças do nosso acervo…</div>}
          {!loading && items && items.length === 0 && <p className="af-anim mt-10 text-[14px] text-ink/70">Não encontramos peças para essa combinação agora. <button onClick={restart} className="underline underline-offset-4">Refaça a curadoria</button> ou fale com um especialista.</p>}
          {msg && <p className="mt-4 text-[13px] text-red-700">{msg}</p>}
          <div className={`mt-10 grid ${compact ? "grid-cols-1 gap-6" : "gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"}`}>
            {items?.map((it) => (
              <article key={it.id} className={`af-anim flex ${compact ? "gap-4" : "flex-col"}`}>
                <Link href={`/produto/${it.slug}`} className={`group block shrink-0 overflow-hidden bg-white ${compact ? "h-28 w-24" : "aspect-[4/5] w-full"}`}>
                  {it.image && <img src={it.image} alt={it.name} loading="lazy" className="h-full w-full object-contain p-[6%] transition duration-[900ms] group-hover:scale-[1.035]" />}
                </Link>
                <div className={`flex min-w-0 flex-1 flex-col ${compact ? "" : "mt-5"}`}>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gold-2">{it.why}</p>
                  <Link href={`/produto/${it.slug}`} className="mt-2 font-serif text-[1.15rem] leading-snug transition-colors hover:text-ink/70">{it.name}</Link>
                  <div className="mt-1.5 text-[13px] tabular-nums text-ink/80">{brl(it.price.price)}</div>
                  <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 ${compact ? "mt-3" : "mt-5"}`}>
                    <button type="button" disabled={pending || !it.available} onClick={() => quickBuy(it)} className="btn-gold !px-5 !py-3 !text-[10px]">{!it.available ? "Esgotado" : it.quickVariantId ? "Compra rápida" : "Escolher tamanho"}</button>
                    {it.tryOn && <Link href={`/provador?produto=${it.slug}`} className="link-line !text-[10px] text-ink">Provador</Link>}
                    {whatsapp && <a href={wa(it)} target="_blank" rel="noopener noreferrer" className="link-line !text-[10px] text-ink">Tirar dúvidas com especialista</a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
