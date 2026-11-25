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
  const field = dark ? "border-0 border-b border-white/25 bg-transparent px-0 text-ivory placeholder:text-ivory/40 focus:border-ivory" : "border-0 border-b border-ink/30 bg-transparent px-0 placeholder:text-stone/70 focus:border-ink";
  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex items-end gap-4">
        <input name="email" type="email" required placeholder="Seu e-mail" aria-label="E-mail" className={`min-w-0 flex-1 py-3 text-sm outline-none transition-colors ${field}`} />
        <button disabled={busy} className={`link-line shrink-0 pb-3.5 ${dark ? "text-ivory" : "text-ink"}`}>{busy ? "Enviando…" : "Inscrever"}</button>
      </div>
      <label className={`mt-4 flex items-start gap-2.5 text-[11px] leading-snug ${dark ? "text-ivory/50" : "text-stone"}`}>
        <input type="checkbox" name="consent" required className="mt-0.5 accent-[#a88f63]" /> {consentText}
      </label>
      {state && <p role="status" className={`mt-2 text-xs ${state.ok ? (dark ? "text-ivory" : "text-ink") : "text-red-500"}`}>{state.msg}</p>}
    </form>
  );
}
