"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { AtelierFinder } from "./AtelierFinder";

type Msg = { id: string; role: "USER" | "AI" | "AGENT" | "SYSTEM"; body: string; agent: string | null; products: { name: string; slug: string; image: string | null; price: number; pix: number }[]; at: string };
type View = "home" | "finder" | "answer" | "chat";
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function Concierge({ greeting, quick, whatsapp, whatsappMessage, chatEnabled }: { greeting: string; quick: { title: string; answer: string }[]; whatsapp: string; whatsappMessage: string; chatEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [answer, setAnswer] = useState<{ title: string; answer: string } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [needsContact, setNeedsContact] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [askHuman, setAskHuman] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [err, setErr] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const path = usePathname();

  const load = useCallback(async (incremental = true) => {
    const last = incremental ? msgs.at(-1)?.at : undefined;
    const r = await fetch(`/api/chat${last ? `?after=${encodeURIComponent(last)}` : ""}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (!r) return;
    setStatus(r.status);
    if (typeof r.needsContact === "boolean") setNeedsContact(r.needsContact);
    if (r.messages?.length) setMsgs((m) => (incremental ? [...m, ...r.messages.filter((n: Msg) => !m.some((o) => o.id === n.id))] : r.messages));
  }, [msgs]);

  // abre por evento (ex.: CTA) ou por ?chat=1 (link do e-mail de resposta da equipe)
  useEffect(() => {
    const go = (e: Event) => { setOpen(true); setView(((e as CustomEvent).detail as View) ?? "home"); };
    window.addEventListener("lx:concierge", go);
    if (new URLSearchParams(window.location.search).get("chat")) { setOpen(true); setView("chat"); }
    return () => window.removeEventListener("lx:concierge", go);
  }, []);
  useEffect(() => { if (open && view === "chat") void load(false); }, [open, view]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open || view !== "chat") return;
    const t = setInterval(() => void load(true), status === "AI" || status === null ? 15000 : 4000);
    return () => clearInterval(t);
  }, [open, view, status, load]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length, busy]);
  useEffect(() => {
    if (open && panel.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      gsap.fromTo(panel.current, { opacity: 0, y: 24, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" });
  }, [open, view]);

  async function post(body: Record<string, unknown>) {
    setBusy(true); setErr(null);
    const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, page: path }) }).then((x) => x.json()).catch(() => ({ ok: false, error: "Falha de conexão." }));
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Não foi possível enviar."); return; }
    setStatus(r.status);
    setNeedsContact(r.needsContact);
    await load(true);
  }
  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const m = text.trim();
    if (!m || busy) return;
    setText("");
    setMsgs((x) => [...x, { id: `tmp-${Date.now()}`, role: "USER", body: m, agent: null, products: [], at: new Date(0).toISOString() }]);
    await post({ message: m });
    setMsgs((x) => x.filter((y) => !y.id.startsWith("tmp-")));
    await load(false);
  };
  const human = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.name || (!contact.email && !contact.phone)) { setErr("Informe seu nome e um e-mail ou telefone para a equipe retornar."); return; }
    await post({ human: true, ...contact });
    setAskHuman(false);
  };

  if (path.startsWith("/checkout")) return null;
  return (
    <>
      <button type="button" onClick={() => { setOpen(!open); setView("home"); }} aria-expanded={open} aria-label="Concierge Luxer"
        className="group fixed bottom-5 right-5 z-[55] flex h-12 w-12 items-center justify-center rounded-full bg-ink text-ivory shadow-[0_8px_24px_-8px_rgba(11,11,12,.45)] transition-transform duration-300 hover:-translate-y-0.5 sm:bottom-7 sm:right-7">
        {open ? <span className="text-xl font-light leading-none">×</span> : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden><path d="M4.5 6.5h15v9.5h-8.5l-4 3v-3H4.5z" /></svg>
        )}
        <span className="pointer-events-none absolute right-14 hidden whitespace-nowrap bg-ivory px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-ink opacity-0 transition group-hover:opacity-100 sm:block">Concierge Luxer</span>
      </button>

      {open && (
        <div ref={panel} role="dialog" aria-label="Concierge Luxer" className="fixed inset-x-0 bottom-0 z-[56] flex max-h-[88svh] flex-col overflow-hidden border border-line bg-ivory text-ink shadow-[0_30px_60px_-30px_rgba(11,11,12,.35)] sm:inset-x-auto sm:bottom-24 sm:right-7 sm:w-[400px]">
          <header className="flex items-center justify-between border-b border-line px-6 py-5">
            <div className="flex items-center gap-3">
              {view !== "home" && <button onClick={() => { setView("home"); setAskHuman(false); }} className="text-stone hover:text-ink" aria-label="Voltar">←</button>}
              <div><div className="font-serif text-xl">Concierge Luxer</div><div className="mt-0.5 text-[10px] uppercase tracking-[0.24em] text-stone">Atendimento de joalheria</div></div>
            </div>
            <button onClick={() => setOpen(false)} className="text-xl font-light text-stone hover:text-ink" aria-label="Fechar">×</button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {view === "home" && (
              <div className="space-y-6">
                <p className="text-[14px] leading-relaxed text-ink/70">{greeting}</p>
                <div className="border-t border-line">
                <button onClick={() => setView("finder")} className="group flex w-full items-center justify-between gap-4 border-b border-line py-4 text-left">
                  <span><span className="block font-serif text-lg">Descobrir minha joia ideal</span><span className="block text-xs text-stone">Curadoria em três escolhas</span></span><span aria-hidden className="h-px w-5 bg-ink/30 transition-all group-hover:w-8 group-hover:bg-gold" />
                </button>
                {chatEnabled && <button onClick={() => setView("chat")} className="group flex w-full items-center justify-between gap-4 border-b border-line py-4 text-left">
                  <span><span className="block font-serif text-lg">Conversar com o Concierge</span><span className="block text-xs text-stone">Dúvidas, sugestões e status de pedido · atendimento humano quando precisar</span></span><span aria-hidden className="h-px w-5 shrink-0 bg-ink/30 transition-all group-hover:w-8 group-hover:bg-gold" />
                </button>}
                </div>
                {quick.length > 0 && <div><div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-stone">Dúvidas rápidas</div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2.5">{quick.map((q) => <button key={q.title} onClick={() => { setAnswer(q); setView("answer"); }} className="text-[13px] text-ink/75 underline-offset-4 hover:text-ink hover:underline">{q.title}</button>)}</div></div>}
                {whatsapp && <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="link-line !text-[10px] text-ink">Prefere WhatsApp? Fale com a equipe</a>}
              </div>
            )}

            {view === "finder" && <AtelierFinder whatsapp={whatsapp} compact onDone={() => setOpen(false)} />}

            {view === "answer" && answer && (
              <div className="space-y-4">
                <h3 className="font-serif text-2xl">{answer.title}</h3>
                <p className="text-[14px] leading-relaxed text-ink/75">{answer.answer}</p>
                <div className="flex flex-wrap gap-6 pt-3">
                  {chatEnabled && <button onClick={() => setView("chat")} className="link-line !text-[10px] text-ink">Perguntar mais</button>}
                  {answer.title.toLowerCase().includes("aro") && <Link href="/categoria/aneis" onClick={() => setOpen(false)} className="link-line !text-[10px] text-ink">Ver anéis</Link>}
                </div>
              </div>
            )}

            {view === "chat" && (
              <div className="space-y-3">
                {msgs.length === 0 && <div className="bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink/80">{greeting}</div>}
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "USER" ? "justify-end" : m.role === "SYSTEM" ? "justify-center" : "justify-start"}`}>
                    {m.role === "SYSTEM" ? <span className="px-3 text-center text-[11px] text-stone">{m.body}</span> : (
                      <div className={`max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed ${m.role === "USER" ? "bg-ink text-ivory" : "bg-surface text-ink/85"}`}>
                        {m.role === "AGENT" && <div className="mb-0.5 text-[10px] uppercase tracking-[0.2em] text-gold-2">{m.agent} · equipe Luxer</div>}
                        <div className="whitespace-pre-wrap">{m.body}</div>
                        {m.products.length > 0 && <div className="mt-3 space-y-2">{m.products.map((p) => (
                          <Link key={p.slug} href={`/produto/${p.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 border-t border-line pt-2 transition-opacity hover:opacity-75">
                            {p.image && <img src={p.image} alt="" className="h-14 w-12 bg-plate object-contain" />}
                            <span className="min-w-0 text-xs"><span className="line-clamp-2 font-serif text-[14px]">{p.name}</span><span className="text-stone">{brl(p.price)} · {brl(p.pix)} no Pix</span></span>
                          </Link>
                        ))}</div>}
                      </div>
                    )}
                  </div>
                ))}
                {busy && <div className="flex justify-start"><div className="bg-surface px-4 py-2.5 text-[13px] text-stone">digitando…</div></div>}
                {(status === "WAITING_HUMAN" || status === "HUMAN") && <p className="text-center text-[11px] text-stone">Você está com a equipe Luxer. As respostas aparecem aqui — pode fechar e voltar depois.</p>}
                {status === "WAITING_HUMAN" && needsContact && !askHuman && <button onClick={() => setAskHuman(true)} className="w-full text-center text-[11px] text-stone underline underline-offset-4">Deixar meu contato para retorno</button>}
                {askHuman && (
                  <form onSubmit={human} className="space-y-3 border-t border-line pt-4">
                    <p className="text-xs text-ink/70">Para a equipe continuar o atendimento:</p>
                    <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Seu nome" className="field !py-2.5 text-sm" />
                    <input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} type="email" placeholder="E-mail" className="field !py-2.5 text-sm" />
                    <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} inputMode="tel" placeholder="WhatsApp (opcional)" className="field !py-2.5 text-sm" />
                    <p className="text-[10px] text-stone">Usaremos seus dados apenas para responder a este atendimento.</p>
                    <button disabled={busy} className="btn-gold w-full !py-3">Chamar atendente</button>
                  </form>
                )}
                {err && <p className="text-xs text-red-700">{err}</p>}
                <div ref={end} />
              </div>
            )}
          </div>

          {view === "chat" && (
            <div className="border-t border-line px-6 py-4">
              <form onSubmit={send} className="flex items-end gap-4">
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder="Escreva sua mensagem…" aria-label="Mensagem" className="min-w-0 flex-1 border-b border-ink/25 bg-transparent py-2 text-[14px] outline-none transition-colors placeholder:text-stone/70 focus:border-ink" />
                <button disabled={busy || !text.trim()} className="pb-2 text-[10.5px] uppercase tracking-[0.22em] text-ink disabled:opacity-30">Enviar</button>
              </form>
              {status === "AI" || status === null ? <button onClick={() => setAskHuman(true)} className="mt-3 w-full text-center text-[11px] text-stone hover:text-ink">Prefere falar com uma pessoa? <u className="underline-offset-4">Chamar atendente</u></button> : null}
            </div>
          )}
        </div>
      )}
    </>
  );
}
