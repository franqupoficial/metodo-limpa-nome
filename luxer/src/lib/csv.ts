export const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
export const csvMoney = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));
export function csvResponse(name: string, header: string, rows: unknown[][]) {
  const body = "﻿" + [header, ...rows.map((r) => r.map(csvCell).join(";"))].join("\r\n");
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
