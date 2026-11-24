"use client";
import { useState } from "react";

export function NewsletterForm({ source, consentText, dark = false }: { source: string; consentText: string; dark?: boolean }) {
  const [state, setState] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const r = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fd.get("email"), name: fd.get("name"), consent: fd.get("consent") === "on", source }) }).then((x) => x.json()).catch(() => ({ ok: false, error: "Falha de conexão." }));
    setBusy(false);
    setState({ ok: r.ok, msg: r.ok ? "Inscrição confirmada. Obrigado!" : r.error });
    if (r.ok) (e.target as HTMLFormElement).reset();
  }
  const field = dark ? "border-white/25 bg-transparent text-ivory placeholder:text-ivory/40 focus:border-gold" : "border-line bg-white";
  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input name="email" type="email" required placeholder="Seu e-mail" aria-label="E-mail" className={`min-w-0 flex-1 border px-4 py-3.5 text-sm outline-none ${field}`} />
        <button disabled={busy} className={dark ? "btn-line border-gold text-gold" : "btn-gold"}>{busy ? "Enviando…" : "Inscrever"}</button>
      </div>
      <label className={`mt-3 flex items-start gap-2 text-[11px] leading-snug ${dark ? "text-ivory/55" : "text-stone"}`}>
        <input type="checkbox" name="consent" required className="mt-0.5" /> {consentText}
      </label>
      {state && <p role="status" className={`mt-2 text-xs ${state.ok ? "text-emerald-500" : "text-red-400"}`}>{state.msg}</p>}
    </form>
  );
}
