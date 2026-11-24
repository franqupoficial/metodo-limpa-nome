export type ActionState = { ok: boolean; message: string; data?: Record<string, string> } | null;
export const ok = (message: string, data?: Record<string, string>): ActionState => ({ ok: true, message, data });
export const fail = (message: string): ActionState => ({ ok: false, message });

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const optStr = (fd: FormData, k: string) => str(fd, k) || null;
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true" || fd.get(k) === "1";
export const int = (fd: FormData, k: string): number | null => {
  const v = str(fd, k);
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};
export const dec = (fd: FormData, k: string): number | null => {
  const v = str(fd, k).replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
export const dateTime = (fd: FormData, k: string): Date | null => {
  const v = str(fd, k);
  if (!v) return null;
  // inputs datetime-local chegam sem fuso: interpreta como horário de Brasília
  const d = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(v) ? v : `${v.length === 10 ? `${v}T00:00` : v}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "1.440,00" | "1440.00" | "1440" → centavos */
export function moneyToCents(v: string): number | null {
  const s = v.replace(/[R$\s]/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
export const centsToInput = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));
export const money = (fd: FormData, k: string) => moneyToCents(str(fd, k));
