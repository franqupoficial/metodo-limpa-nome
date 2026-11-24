"use client";
import { useEffect, useRef, useState } from "react";

type M = { id: string; role: string; body: string; adminName: string | null; at: string; products: { name: string; slug: string }[] };

/** Conversa ao vivo no painel: atualiza a cada 4 s enquanto aberta. */
export function ChatThread({ id, initial }: { id: string; initial: M[] }) {
  const [msgs, setMsgs] = useState<M[]>(initial);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const last = msgs.at(-1)?.at;
      const r = await fetch(`/api/admin/chat/${id}${last ? `?after=${encodeURIComponent(last)}` : ""}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      if (alive && r?.messages?.length) setMsgs((m) => [...m, ...r.messages.filter((n: M) => !m.some((o) => o.id === n.id))]);
    };
    const t = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(t); };
  }, [id, msgs]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);
  return (
    <div className="h-[52vh] space-y-3 overflow-y-auto bg-zinc-50 p-4">
      {msgs.map((m) => (
        <div key={m.id} className={`flex ${m.role === "USER" ? "justify-start" : m.role === "SYSTEM" ? "justify-center" : "justify-end"}`}>
          {m.role === "SYSTEM" ? <span className="rounded-full bg-zinc-200 px-3 py-1 text-[11px] text-zinc-600">{m.body}</span> : (
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "USER" ? "bg-white ring-1 ring-zinc-200" : m.role === "AI" ? "bg-[#f7f0e2] text-zinc-800" : "bg-zinc-900 text-zinc-50"}`}>
              <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-60">{m.role === "USER" ? "Cliente" : m.role === "AI" ? "Concierge IA" : m.adminName ?? "Equipe"}</div>
              <div className="whitespace-pre-wrap">{m.body}</div>
              {m.products.length > 0 && <div className="mt-1 text-[11px] opacity-70">Peças citadas: {m.products.map((p) => p.name).join(", ")}</div>}
              <div className="mt-1 text-right text-[10px] opacity-50">{new Date(m.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          )}
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}

export function AutoRefreshList({ seconds = 10 }: { seconds?: number }) {
  useEffect(() => {
    const t = setInterval(() => window.location.reload(), seconds * 1000);
    return () => clearInterval(t);
  }, [seconds]);
  return null;
}
