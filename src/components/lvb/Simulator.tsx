"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { simulate } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import type { ClientPlanSettings, ClientVehicle } from "./types";
import { Icon } from "@/components/Icon";

export function Simulator({ vehicles, settings, initialVehicleId }: { vehicles: ClientVehicle[]; settings: ClientPlanSettings; initialVehicleId?: string }) {
  const categories = useMemo(() => Array.from(new Map(vehicles.map((v) => [v.categorySlug, v.categoryName])).entries()), [vehicles]);
  const initial = vehicles.find((v) => v.id === initialVehicleId) ?? vehicles[0];
  const [category, setCategory] = useState(initial?.categorySlug ?? "");
  const [vehicleId, setVehicleId] = useState(initial?.id ?? "");
  const [term, setTerm] = useState(initial?.terms[0] ?? 12);
  const [kmId, setKmId] = useState(settings.kmPackages[0]?.id ?? "");

  const inCategory = vehicles.filter((v) => v.categorySlug === category);
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? inCategory[0];
  if (!vehicle) return <p className="text-muted">Nenhum veículo disponível para simulação no momento.</p>;
  const terms = vehicle.terms.length ? vehicle.terms : [12, 24, 36];
  const termSafe = terms.includes(term) ? term : terms[0];
  const kmPackage = settings.kmPackages.find((k) => k.id === kmId) ?? null;
  const sim = simulate({ baseMonthlyCents: vehicle.monthlyCents, termMonths: termSafe, termAdjustments: settings.termAdjustments, kmPackage });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="card space-y-5 p-5 sm:p-6">
        <div>
          <label htmlFor="sim-cat" className="label">Categoria</label>
          <select id="sim-cat" className="input" value={category} onChange={(e) => { setCategory(e.target.value); const first = vehicles.find((v) => v.categorySlug === e.target.value); if (first) setVehicleId(first.id); }}>
            {categories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sim-veh" className="label">Veículo</label>
          <select id="sim-veh" className="input" value={vehicle.id} onChange={(e) => setVehicleId(e.target.value)}>
            {inCategory.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.name} — {formatMoney(v.monthlyCents)}/mês</option>)}
          </select>
        </div>
        <fieldset>
          <legend className="label">Prazo do contrato</legend>
          <div className="grid grid-cols-3 gap-2">
            {terms.map((t) => (
              <button key={t} type="button" onClick={() => setTerm(t)} aria-pressed={termSafe === t} className={`rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${termSafe === t ? "border-lvb-600 bg-lvb-50 text-lvb-700 ring-2 ring-lvb-100" : "border-line hover:bg-surface"}`}>
                {t} meses
              </button>
            ))}
          </div>
        </fieldset>
        {settings.kmPackages.length > 0 ? (
          <div>
            <label htmlFor="sim-km" className="label">Pacote de quilometragem</label>
            <select id="sim-km" className="input" value={kmId} onChange={(e) => setKmId(e.target.value)}>
              {settings.kmPackages.map((k) => <option key={k.id} value={k.id}>{k.label}{k.surchargePercent ? ` (+${k.surchargePercent}%)` : ""}</option>)}
            </select>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-surface p-3 text-sm"><Icon name="gauge" className="h-5 w-5 text-lvb-600" /> Franquia de quilometragem: <strong>{vehicle.kmPerMonth.toLocaleString("pt-BR")} km/mês</strong></p>
        )}
      </div>

      <aside className="card overflow-hidden" aria-live="polite">
        <div className="bg-lvb-700 p-5 text-white">
          <p className="text-xs uppercase tracking-wider text-lvb-100">Simulação — {vehicle.categoryName}</p>
          <p className="mt-1 font-semibold">{vehicle.brand} {vehicle.name}</p>
          <p className="mt-3 text-4xl font-extrabold">{formatMoney(sim.monthlyCents)}<span className="text-base font-medium text-lvb-100">/mês</span></p>
        </div>
        <dl className="divide-y divide-line text-sm">
          {[
            ["Prazo", `${sim.termMonths} meses`],
            ["Primeira parcela (via Pix ao concluir o pedido)", formatMoney(sim.firstInstallmentCents)],
            ["Demais parcelas", `${sim.remainingInstallments}× de ${formatMoney(sim.monthlyCents)} (Pix ou boleto mensal)`],
            ["Quilometragem", kmPackage ? kmPackage.label : `${vehicle.kmPerMonth.toLocaleString("pt-BR")} km/mês`],
            ["Entrega na sua região", settings.deliveryWindow],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-5 py-3"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
          ))}
          <div className="flex justify-between gap-4 bg-lvb-50 px-5 py-3"><dt className="font-semibold">Total estimado do contrato</dt><dd className="text-right text-lg font-extrabold text-lvb-700">{formatMoney(sim.totalCents)}</dd></div>
        </dl>
        <div className="space-y-3 p-5 text-xs leading-relaxed text-muted">
          <p>{settings.priceNotice}</p>
          <ul className="space-y-1">
            {settings.inclusions.map((i) => <li key={i.label} className="flex justify-between gap-2"><span>{i.label}</span><span className="font-semibold text-ink">{i.status}</span></li>)}
          </ul>
          <details>
            <summary className="cursor-pointer font-semibold text-lvb-700">Custos que podem ser aplicáveis</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {settings.costs.map((c) => <li key={c.label}><strong className="text-ink">{c.label}:</strong> {c.description}</li>)}
            </ul>
          </details>
          <Link href={`/lvb/solicitar?veiculo=${vehicle.slug}&prazo=${sim.termMonths}${kmPackage ? `&km=${kmPackage.id}` : ""}`} className="btn-lvb w-full">Alugar com este plano</Link>
        </div>
      </aside>
    </div>
  );
}
