"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Gráficos do painel — SVG puro, sem dependências.
 * Cores por papel (validadas pelo método dataviz): série atual = categórica 1 (#2a78d6);
 * comparação = cinza neutro; grade e eixos em hairline recessiva; texto sempre em tokens de texto.
 */
const C = { series: "#2a78d6", compare: "#a1a1aa", grid: "#ececef", axis: "#d4d4d8", text: "#18181b", muted: "#71717a", surface: "#ffffff" };

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const compact = (c: number) => {
  const v = c / 100;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (v >= 10_000) return `R$ ${Math.round(v / 1000)} mil`;
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(300);
  useEffect(() => {
    if (!ref.current) return;
    setW(Math.max(240, ref.current.clientWidth));
    const ro = new ResizeObserver((e) => setW(Math.max(240, e[0].contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

export function RevenueChart({ data, currentLabel, previousLabel }: { data: { label: string; current: number; previous: number }[]; currentLabel: string; previousLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const H = 240, padL = 64, padR = 16, padT = 12, padB = 28;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.current, d.previous)), 0));
  const iw = width - padL - padR, ih = H - padT - padB;
  const x = (i: number) => padL + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => padT + ih - (v / max) * ih;
  const path = (k: "current" | "previous") => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join("");
  const area = `${path("current")}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const step = Math.max(1, Math.ceil(data.length / Math.floor(iw / 60)));
  const empty = data.every((d) => !d.current && !d.previous);

  return (
    <div ref={ref} className="w-full min-w-0 overflow-hidden">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: C.series }} /> {currentLabel}</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: C.compare }} /> {previousLabel}</span>
        <button type="button" onClick={() => setTable(!table)} className="ml-auto text-xs font-medium text-zinc-500 underline-offset-2 hover:underline">{table ? "Ver gráfico" : "Ver tabela"}</button>
      </div>
      {table ? (
        <div className="max-h-64 overflow-auto">
          <table className="tbl"><thead><tr><th>Dia</th><th className="text-right">{currentLabel}</th><th className="text-right">{previousLabel}</th></tr></thead>
            <tbody>{data.map((d) => <tr key={d.label}><td>{d.label}</td><td className="text-right tabular-nums">{brl(d.current)}</td><td className="text-right tabular-nums">{brl(d.previous)}</td></tr>)}</tbody></table>
        </div>
      ) : (
        <div className="relative">
          <svg width={width} height={H} role="img" aria-label={`Faturamento diário: ${currentLabel} comparado a ${previousLabel}`}
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
              const px = e.clientX - r.left;
              const i = Math.round(((px - padL) / iw) * (data.length - 1));
              setHover(Math.min(data.length - 1, Math.max(0, i)));
            }}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.axis : C.grid} strokeWidth={1} />
                {!empty && <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={C.muted}>{compact(t)}</text>}
              </g>
            ))}
            {data.map((d, i) => (i % step === 0 || i === data.length - 1) && (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={C.muted}>{d.label}</text>
            ))}
            {!empty && <>
              <path d={area} fill={C.series} opacity={0.1} />
              <path d={path("previous")} fill="none" stroke={C.compare} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <path d={path("current")} fill="none" stroke={C.series} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={x(data.length - 1)} cy={y(data.at(-1)!.current)} r={4} fill={C.series} stroke={C.surface} strokeWidth={2} />
            </>}
            {empty && <text x={padL + iw / 2} y={padT + ih / 2} textAnchor="middle" fontSize={13} fill={C.muted}>Sem vendas pagas no período</text>}
            {hover != null && !empty && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke={C.axis} strokeWidth={1} />
                <circle cx={x(hover)} cy={y(data[hover].previous)} r={4} fill={C.compare} stroke={C.surface} strokeWidth={2} />
                <circle cx={x(hover)} cy={y(data[hover].current)} r={4} fill={C.series} stroke={C.surface} strokeWidth={2} />
              </g>
            )}
          </svg>
          {hover != null && !empty && (
            <div className="pointer-events-none absolute top-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg"
              style={{ left: Math.min(Math.max(x(hover) + 12, 0), width - 190) }}>
              <div className="mb-1 font-semibold text-zinc-800">{data[hover].label}</div>
              <div className="flex items-center gap-2 text-zinc-700"><span className="h-2 w-2 rounded-full" style={{ background: C.series }} />{currentLabel}: <b className="tabular-nums">{brl(data[hover].current)}</b></div>
              <div className="flex items-center gap-2 text-zinc-500"><span className="h-2 w-2 rounded-full" style={{ background: C.compare }} />{previousLabel}: <span className="tabular-nums">{brl(data[hover].previous)}</span></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Barras horizontais de uma série (ex.: vendas por categoria). Valor na ponta; tooltip no hover. */
export function BarList({ rows, format = "money" }: { rows: { label: string; value: number; hint?: string }[]; format?: "money" | "int" }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const [hover, setHover] = useState<number | null>(null);
  const fmt = (v: number) => (format === "money" ? brl(v) : v.toLocaleString("pt-BR"));
  if (!rows.length) return <div className="py-8 text-center text-sm text-zinc-500">Sem dados no período.</div>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.label} className="relative" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate text-zinc-700">{r.label}</span><span className="tabular-nums font-medium text-zinc-900">{fmt(r.value)}</span></div>
          <div className="h-2.5 w-full">
            <div className="h-2.5 rounded-r-[4px]" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%`, background: C.series, opacity: hover == null || hover === i ? 1 : 0.55 }} />
          </div>
          {hover === i && r.hint && <div className="absolute right-0 top-6 z-10 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 shadow">{r.hint}</div>}
        </li>
      ))}
    </ul>
  );
}
