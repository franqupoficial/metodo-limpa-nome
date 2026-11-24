"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";
import { StatusBadge, Notice } from "./ui";
import { Icon } from "./Icon";
import { PixPayment, type PixData } from "./PixPayment";
import { formatMoney } from "@/lib/format";

interface Result {
  protocol: string; service: string; status: string; tone: "gray" | "blue" | "amber" | "green" | "red"; nextSteps: string;
  createdAt: string; updatedAt: string; info: string | null; pix: PixData[]; boletos: { description: string | null; amountCents: number; dueDate: string | null }[]; history: { status: string; date: string; note: string | null }[];
}

export function TrackForm({ initialProtocol }: { initialProtocol: string }) {
  const [protocol, setProtocol] = useState(initialProtocol);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch("/api/acompanhar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ protocol, accessCode: code }) });
      const j = await r.json();
      if (r.ok) setResult(j); else setError(j.error ?? "Não foi possível consultar.");
    } catch { setError("Falha de conexão. Tente novamente."); }
    setLoading(false);
  }

  const lastNote = result?.history.filter((h) => h.note).at(-1)?.note;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="card h-fit space-y-4 p-6" noValidate>
        <div>
          <label htmlFor="protocolo" className="label">Número de protocolo</label>
          <input id="protocolo" className="input font-mono uppercase" value={protocol} onChange={(e) => setProtocol(e.target.value.toUpperCase())} placeholder="PC-XXX-AAAAMMDD-XXXXX" autoComplete="off" required />
        </div>
        <div>
          <label htmlFor="codigo" className="label">Código de acesso</label>
          <input id="codigo" className="input font-mono uppercase tracking-widest" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} placeholder="8 caracteres" autoComplete="off" required />
          <p className="hint">O código foi exibido na tela de confirmação da solicitação.</p>
        </div>
        {error && <p role="alert" className="field-error text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Consultando…" : "Consultar"}</button>
        <p className="text-xs text-muted">Por segurança, não é possível consultar apenas pelo CPF e nenhum dado pessoal é exibido nesta página.</p>
      </form>
      <div aria-live="polite">
        {result ? (
          <div className="card animate-fade-up p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">Protocolo</p>
                <p className="font-mono text-lg font-bold">{result.protocol}</p>
              </div>
              <StatusBadge label={result.status} tone={result.tone} />
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-muted">Serviço</dt><dd className="font-medium">{result.service}</dd></div>
              <div><dt className="text-xs text-muted">Data da solicitação</dt><dd className="font-medium">{formatDate(result.createdAt)}</dd></div>
              <div><dt className="text-xs text-muted">Última atualização</dt><dd className="font-medium">{formatDate(result.updatedAt, true)}</dd></div>
              {result.info && <div className="sm:col-span-3"><dt className="text-xs text-muted">Plano</dt><dd className="font-medium">{result.info}</dd></div>}
            </dl>
            <div className="mt-6"><Notice tone="info" title="Próximos passos">{result.nextSteps}</Notice></div>
            {lastNote && <div className="mt-3"><Notice tone="warn" title="Informações necessárias">{lastNote}</Notice></div>}
            {result.pix.length > 0 && (
              <div className="mt-6 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Pagamentos pendentes</h2>
                {result.pix.map((p, i) => <PixPayment key={i} pix={p} title={p.description || "Pague com Pix"} />)}
              </div>
            )}
            {result.boletos.length > 0 && (
              <div className="mt-4"><Notice tone="info" title="Boletos enviados ao seu e-mail">{result.boletos.map((b, i) => <span key={i} className="block">{b.description}: {formatMoney(b.amountCents)}{b.dueDate ? ` — vence em ${formatDate(b.dueDate)}` : ""}</span>)}</Notice></div>
            )}
            <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted">Histórico</h2>
            <ol className="mt-3 space-y-3 border-l-2 border-brand-100 pl-5">
              {result.history.map((h, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-600" />
                  <p className="font-semibold">{h.status}</p>
                  <p className="text-xs text-muted">{formatDate(h.date, true)}</p>
                  {h.note && <p className="mt-1 text-muted">{h.note}</p>}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="card flex h-full min-h-60 flex-col items-center justify-center p-8 text-center text-muted">
            <Icon name="track" className="h-10 w-10 text-brand-300" />
            <p className="mt-3">Informe os dados ao lado para consultar o andamento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
