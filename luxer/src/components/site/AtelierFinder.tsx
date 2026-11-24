"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { addToCart } from "@/app/(loja)/_actions/cart";

type Item = { id: string; name: string; slug: string; ref: string | null; image: string | null; cutout: string | null; why: string; tryOn: boolean; quickVariantId: string | null; available: boolean; price: { price: number; pix: number; installments: number; installmentValue: number } };
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
    gsap.fromTo(panel.current.querySelectorAll(".af-anim"), { opacity: 0, y: 22, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power3.out", stagger: 0.06 });
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
    if (panel.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.to(panel.current.querySelectorAll(".af-anim"), { opacity: 0, x: -24, duration: 0.28, ease: "power2.in", stagger: 0.02, onComplete: outro });
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
    <div ref={panel} className={`relative text-ivory ${compact ? "" : "mx-auto max-w-6xl"}`}>
      {step < 3 ? (
        <div>
          <div className="af-anim mb-6 flex items-center gap-3">
            {[0, 1, 2].map((i) => <span key={i} className={`h-[2px] flex-1 rounded transition-colors duration-500 ${i <= step ? "bg-[var(--color-atelier)]" : "bg-white/12"}`} />)}
            <span className="text-[10px] uppercase tracking-[0.25em] text-ivory/45">{step + 1}/3</span>
          </div>
          <h3 className={`af-anim display ${compact ? "text-2xl" : "text-3xl sm:text-5xl"}`}>{s.q}</h3>
          <div className={`mt-7 grid gap-3 ${compact ? "grid-cols-1" : s.opts.length > 4 ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
            {s.opts.map(([k, l, d]) => (
              <button key={k} type="button" onClick={() => choose(s.key, k)} className={`af-anim lx-glass group rounded-sm p-5 text-left transition hover:border-[var(--color-atelier)] hover:bg-white/[0.07] active:scale-[0.99] ${compact ? "py-4" : "min-h-[128px]"}`}>
                <div className="font-serif text-xl leading-tight text-ivory group-hover:text-[var(--color-atelier)]">{l}</div>
                <div className="mt-2 text-xs text-ivory/50">{d}</div>
              </button>
            ))}
          </div>
          {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="af-anim mt-6 text-[11px] uppercase tracking-[0.22em] text-ivory/50 hover:text-ivory">← Voltar</button>}
        </div>
      ) : (
        <div>
          <div className="af-anim flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-atelier)]">Seleção curada para você</div>
              <h3 className={`display mt-2 ${compact ? "text-2xl" : "text-3xl sm:text-5xl"}`}>{LABEL[sel.ocasiao]}</h3>
              <p className="mt-1 text-xs text-ivory/50">{LABEL[sel.metal]} · {LABEL[sel.peca]}</p>
            </div>
            <button type="button" onClick={restart} className="text-[11px] uppercase tracking-[0.22em] text-ivory/60 underline-offset-4 hover:text-ivory hover:underline">↺ Refazer curadoria</button>
          </div>
          {loading && <div className="af-anim mt-10 animate-pulse font-serif text-xl text-ivory/50">Selecionando peças do nosso acervo…</div>}
          {!loading && items && items.length === 0 && <p className="af-anim mt-10 text-ivory/60">Não encontramos peças para essa combinação agora. <button onClick={restart} className="underline">Refaça a curadoria</button> ou fale com um especialista.</p>}
          {msg && <p className="mt-4 text-sm text-red-300">{msg}</p>}
          <div className={`mt-8 grid gap-4 ${compact ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {items?.map((it) => (
              <article key={it.id} className={`af-anim lx-glass flex rounded-sm ${compact ? "gap-4 p-3" : "flex-col p-5"}`}>
                <Link href={`/produto/${it.slug}`} className={`relative block shrink-0 ${compact ? "h-24 w-24" : "aspect-square w-full"}`}>
                  <div aria-hidden className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.18),transparent_70%)] blur-2xl" />
                  {(it.cutout ?? it.image) && <img src={(it.cutout ?? it.image)!} alt={it.name} loading="lazy" className="relative h-full w-full object-contain p-2 [filter:drop-shadow(0_18px_22px_rgba(0,0,0,.55))]" />}
                </Link>
                <div className={`flex min-w-0 flex-1 flex-col ${compact ? "" : "mt-4"}`}>
                  <Link href={`/produto/${it.slug}`} className="font-serif text-lg leading-snug hover:text-[var(--color-atelier)]">{it.name}</Link>
                  <p className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--color-atelier)]/90">{it.why}</p>
                  <div className="mt-3 text-sm">{brl(it.price.price)} <span className="text-ivory/50">· {brl(it.price.pix)} no Pix</span></div>
                  <div className={`mt-4 flex flex-wrap gap-2 ${compact ? "" : "mt-auto pt-4"}`}>
                    <button type="button" disabled={pending || !it.available} onClick={() => quickBuy(it)} className="lx-liquid !px-4 !py-2.5 !text-[10px]">{!it.available ? "Esgotado" : it.quickVariantId ? "Compra rápida" : "Escolher tamanho"}</button>
                    {it.tryOn && <Link href={`/provador?produto=${it.slug}`} className="lx-ghost !px-4 !py-2.5 !text-[10px]">Provador</Link>}
                    {whatsapp && <a href={wa(it)} target="_blank" rel="noopener noreferrer" className="lx-ghost !px-4 !py-2.5 !text-[10px]">Tirar dúvidas com especialista</a>}
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
