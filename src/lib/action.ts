export type ActionState = { ok: boolean; message: string; data?: Record<string, string> } | null;
export const ok = (message: string, data?: Record<string, string>): ActionState => ({ ok: true, message, data });
export const fail = (message: string): ActionState => ({ ok: false, message });

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
/** "1.440,00" | "1440.00" | "1440" → centavos */
export function moneyToCents(v: string): number | null {
  const s = v.replace(/[R$\s]/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
export const centsToInput = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));
