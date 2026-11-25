"use client";
/**
 * Monitoramento de erros no navegador (sem serviço externo): envia um resumo ao servidor, que registra nos logs
 * da hospedagem. Sem dados pessoais: só tipo, mensagem, trecho da pilha e o caminho da página (sem query string).
 * Deduplicado e limitado a poucos envios por página para não pesar nem inundar o log.
 */
const sent = new Set<string>();
let count = 0;

export function reportClientError(kind: string, err: unknown, extra?: Record<string, string | number | boolean>) {
  try {
    if (typeof window === "undefined" || count >= 6) return;
    const e = err instanceof Error ? err : new Error(String(err));
    const key = `${kind}:${e.message}`.slice(0, 200);
    if (sent.has(key)) return;
    sent.add(key); count++;
    const body = JSON.stringify({ kind, message: e.message.slice(0, 300), stack: (e.stack ?? "").split("\n").slice(0, 6).join("\n").slice(0, 1200), path: location.pathname, extra });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/client-error", blob)) fetch("/api/client-error", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  } catch { /* o monitor nunca derruba a página */ }
}
