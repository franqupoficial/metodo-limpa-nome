"use client";

import { useState } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import { Icon } from "./Icon";

export interface PixData {
  amountCents: number;
  description: string;
  dueDate: string | null;
  payload: string;
  qr: string;
  receiverName: string;
  key: string;
  instructions: string;
}

export function PixPayment({ pix, title = "Pague com Pix" }: { pix: PixData; title?: string }) {
  const [copied, setCopied] = useState<"" | "code" | "key">("");
  const copy = async (text: string, which: "code" | "key") => {
    try { await navigator.clipboard.writeText(text); setCopied(which); setTimeout(() => setCopied(""), 2500); } catch { /* sem permissão */ }
  };
  return (
    <section className="overflow-hidden rounded-2xl border-2 border-emerald-300 bg-white text-left" aria-label="Pagamento Pix">
      <div className="flex items-center justify-between gap-3 bg-emerald-600 px-5 py-3 text-white">
        <p className="font-bold">{title}</p>
        <p className="text-xl font-extrabold">{formatMoney(pix.amountCents)}</p>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-[200px_1fr]">
        {pix.qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pix.qr} alt="QR Code Pix para pagamento" width={200} height={200} className="mx-auto h-[200px] w-[200px] rounded-lg border border-line" />
        )}
        <div className="min-w-0 space-y-3 text-sm">
          <p><span className="text-muted">Referente a:</span> <strong>{pix.description}</strong>{pix.dueDate && <> · vencimento {formatDate(pix.dueDate)}</>}</p>
          <p><span className="text-muted">Recebedor:</span> <strong>{pix.receiverName}</strong></p>
          <div>
            <p className="mb-1 text-xs font-semibold text-muted">Pix copia e cola</p>
            <div className="flex gap-2">
              <input readOnly value={pix.payload} className="input min-w-0 font-mono text-xs" aria-label="Código Pix copia e cola" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="btn-primary btn-sm shrink-0 bg-emerald-600 hover:bg-emerald-700" onClick={() => copy(pix.payload, "code")}>
                <Icon name={copied === "code" ? "check" : "doc"} className="h-4 w-4" />{copied === "code" ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted">
            Ou use a chave aleatória: <button type="button" className="font-mono font-semibold text-ink underline decoration-dotted" onClick={() => copy(pix.key, "key")}>{pix.key}</button>
            {copied === "key" && <span className="ml-1 text-emerald-700">copiada</span>}
          </p>
          <ol className="list-decimal space-y-0.5 pl-5 text-xs text-muted">
            <li>Abra o app do seu banco e escolha Pix → Pagar com QR Code ou Pix copia e cola.</li>
            <li>Confira o recebedor <strong>{pix.receiverName}</strong> e o valor antes de confirmar.</li>
            <li>{pix.instructions}</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
