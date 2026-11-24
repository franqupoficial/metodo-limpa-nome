"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="mt-2 rounded border px-3 py-1 text-xs print:hidden">Imprimir</button>;
}
