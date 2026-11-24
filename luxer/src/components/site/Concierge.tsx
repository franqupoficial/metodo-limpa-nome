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
        className="group fixed bottom-5 right-5 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-[#0b0b0c] text-[var(--color-atelier)] shadow-[0_10px_30px_rgba(0,0,0,.35)] ring-1 ring-[var(--color-atelier)]/50 transition hover:scale-105 sm:bottom-7 sm:right-7">
        {open ? <span className="text-2xl leading-none">×</span> : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.3} aria-hidden><path d="M12 3l2.1 4.6L19 8.3l-3.6 3.4.9 4.9L12 14.3l-4.3 2.3.9-4.9L5 8.3l4.9-.7z" /></svg>
        )}
        <span className="pointer-events-none absolute right-16 hidden whitespace-nowrap bg-[#0b0b0c] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[var(--color-atelier)] opacity-0 transition group-hover:opacity-100 sm:block">Concierge Luxer</span>
      </button>

      {open && (
        <div ref={panel} role="dialog" aria-label="Concierge Luxer" className="fixed inset-x-0 bottom-0 z-[56] flex max-h-[88svh] flex-col overflow-hidden rounded-t-2xl bg-[#0b0b0c]/95 text-ivory shadow-2xl ring-1 ring-white/10 backdrop-blur-xl sm:inset-x-auto sm:bottom-24 sm:right-7 sm:w-[400px] sm:rounded-2xl">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              {view !== "home" && <button onClick={() => { setView("home"); setAskHuman(false); }} className="text-ivory/60 hover:text-ivory" aria-label="Voltar">←</button>}
              <div><div className="font-serif text-lg tracking-[0.2em]">CONCIERGE</div><div className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-atelier)]">Luxer Joias</div></div>
            </div>
            <button onClick={() => setOpen(false)} className="text-xl text-ivory/60 hover:text-ivory" aria-label="Fechar">×</button>
          </header>

          <div className="flex-1 overflow-y-auto p-5">
            {view === "home" && (
              <div className="space-y-5">
                <p className="text-sm leading-relaxed text-ivory/75">{greeting}</p>
                <button onClick={() => setView("finder")} className="lx-glass w-full rounded-sm p-4 text-left transition hover:border-[var(--color-atelier)]">
                  <div className="font-serif text-lg">✦ Descobrir minha joia ideal</div><div className="text-xs text-ivory/50">Curadoria em 3 toques</div>
                </button>
                {chatEnabled && <button onClick={() => setView("chat")} className="lx-glass w-full rounded-sm p-4 text-left transition hover:border-[var(--color-atelier)]">
                  <div className="font-serif text-lg">Conversar com o Concierge</div><div className="text-xs text-ivory/50">Dúvidas, sugestões e status de pedido · atendimento humano quando precisar</div>
                </button>}
                {quick.length > 0 && <div><div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-ivory/40">Dúvidas rápidas</div>
                  <div className="flex flex-wrap gap-2">{quick.map((q) => <button key={q.title} onClick={() => { setAnswer(q); setView("answer"); }} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-ivory/80 hover:border-[var(--color-atelier)] hover:text-ivory">{q.title}</button>)}</div></div>}
                {whatsapp && <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="block text-center text-[11px] uppercase tracking-[0.22em] text-ivory/50 hover:text-ivory">Prefere WhatsApp? Fale com a equipe →</a>}
              </div>
            )}

            {view === "finder" && <AtelierFinder whatsapp={whatsapp} compact onDone={() => setOpen(false)} />}

            {view === "answer" && answer && (
              <div className="space-y-4">
                <h3 className="font-serif text-2xl">{answer.title}</h3>
                <p className="text-sm leading-relaxed text-ivory/80">{answer.answer}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {chatEnabled && <button onClick={() => setView("chat")} className="lx-ghost !px-4 !py-2.5 !text-[10px]">Perguntar mais</button>}
                  {answer.title.toLowerCase().includes("aro") && <Link href="/categoria/aneis" onClick={() => setOpen(false)} className="lx-ghost !px-4 !py-2.5 !text-[10px]">Ver anéis</Link>}
                </div>
              </div>
            )}

            {view === "chat" && (
              <div className="space-y-3">
                {msgs.length === 0 && <div className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-ivory/80">{greeting}</div>}
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "USER" ? "justify-end" : m.role === "SYSTEM" ? "justify-center" : "justify-start"}`}>
                    {m.role === "SYSTEM" ? <span className="px-3 text-center text-[11px] text-[var(--color-atelier)]/80">{m.body}</span> : (
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "USER" ? "bg-[var(--color-atelier)] text-[#0b0b0c]" : "bg-white/[0.07] text-ivory/90"}`}>
                        {m.role === "AGENT" && <div className="mb-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--color-atelier)]">{m.agent} · equipe Luxer</div>}
                        <div className="whitespace-pre-wrap">{m.body}</div>
                        {m.products.length > 0 && <div className="mt-3 space-y-2">{m.products.map((p) => (
                          <Link key={p.slug} href={`/produto/${p.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg bg-black/30 p-2 hover:bg-black/50">
                            {p.image && <img src={p.image} alt="" className="h-12 w-12 rounded bg-ivory object-cover mix-blend-normal" />}
                            <span className="min-w-0 text-xs"><span className="line-clamp-2">{p.name}</span><span className="text-ivory/60">{brl(p.price)} · {brl(p.pix)} no Pix</span></span>
                          </Link>
                        ))}</div>}
                      </div>
                    )}
                  </div>
                ))}
                {busy && <div className="flex justify-start"><div className="rounded-2xl bg-white/[0.07] px-4 py-2.5 text-sm text-ivory/50">digitando…</div></div>}
                {(status === "WAITING_HUMAN" || status === "HUMAN") && <p className="text-center text-[11px] text-ivory/45">Você está com a equipe Luxer. As respostas aparecem aqui — pode fechar e voltar depois.</p>}
                {status === "WAITING_HUMAN" && needsContact && !askHuman && <button onClick={() => setAskHuman(true)} className="w-full text-center text-[11px] underline text-ivory/60">Deixar meu contato para retorno</button>}
                {askHuman && (
                  <form onSubmit={human} className="lx-glass space-y-2 rounded-sm p-4">
                    <p className="text-xs text-ivory/70">Para a equipe continuar o atendimento:</p>
                    <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Seu nome" className="w-full rounded bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-ivory/35" />
                    <input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} type="email" placeholder="E-mail" className="w-full rounded bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-ivory/35" />
                    <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} inputMode="tel" placeholder="WhatsApp (opcional)" className="w-full rounded bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-ivory/35" />
                    <p className="text-[10px] text-ivory/40">Usaremos seus dados apenas para responder a este atendimento.</p>
                    <button disabled={busy} className="lx-liquid w-full !py-2.5">Chamar atendente</button>
                  </form>
                )}
                {err && <p className="text-xs text-red-300">{err}</p>}
                <div ref={end} />
              </div>
            )}
          </div>

          {view === "chat" && (
            <div className="border-t border-white/10 p-3">
              <form onSubmit={send} className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder="Escreva sua mensagem…" aria-label="Mensagem" className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm outline-none placeholder:text-ivory/35 focus:ring-1 focus:ring-[var(--color-atelier)]" />
                <button disabled={busy || !text.trim()} className="rounded-full bg-[var(--color-atelier)] px-4 text-sm font-medium text-[#0b0b0c] disabled:opacity-40">Enviar</button>
              </form>
              {status === "AI" || status === null ? <button onClick={() => setAskHuman(true)} className="mt-2 w-full text-center text-[11px] text-ivory/50 hover:text-ivory">Prefere falar com uma pessoa? <u>Chamar atendente</u></button> : null}
            </div>
          )}
        </div>
      )}
    </>
  );
}
