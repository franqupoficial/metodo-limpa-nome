"use client";

import { useState } from "react";
import type { Vehicle, VehicleCategory } from "@prisma/client";
import { ActionForm, Submit } from "./ActionForm";
import { positionedPrice, referenceIsStale, REFERENCE_MAX_AGE_DAYS } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { centsToInput, moneyToCents, type ActionState } from "@/lib/action";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  vehicle?: Vehicle | null;
  categories: Pick<VehicleCategory, "id" | "name">[];
};

export function VehicleForm({ action, vehicle: v, categories }: Props) {
  const [mode, setMode] = useState<"MANUAL" | "REFERENCE">(v?.pricingMode ?? "MANUAL");
  const [ref, setRef] = useState(centsToInput(v?.referencePriceCents));
  const [disc, setDisc] = useState(String(v?.discountPercent ?? 20));
  const [refDate, setRefDate] = useState(v?.referenceDate ? new Date(v.referenceDate).toISOString().slice(0, 10) : "");
  const refCents = moneyToCents(ref);
  let preview: number | null = null;
  try { preview = refCents ? positionedPrice(refCents, Number(disc)) : null; } catch { preview = null; }
  const stale = refDate ? referenceIsStale(new Date(refDate + "T12:00:00")) : false;

  return (
    <ActionForm action={action} className="space-y-6">
      {v && <input type="hidden" name="id" value={v.id} />}
      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-bold">Identificação</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label><span className="label">Marca</span><input name="brand" defaultValue={v?.brand} required className="input" /></label>
          <label className="sm:col-span-2"><span className="label">Modelo (use “ou similar” quando aplicável)</span><input name="name" defaultValue={v?.name} required className="input" /></label>
          <label><span className="label">Categoria</span><select name="categoryId" defaultValue={v?.categoryId} required className="input">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label><span className="label">Slug (URL)</span><input name="slug" defaultValue={v?.slug} className="input" placeholder="gerado automaticamente" /></label>
          <label><span className="label">Ordem de exibição</span><input name="sortOrder" type="number" min={0} defaultValue={v?.sortOrder ?? 0} className="input" /></label>
        </div>
        <label className="block"><span className="label">Descrição</span><textarea name="description" defaultValue={v?.description} required rows={3} className="input" /></label>
        <label className="block"><span className="label">Características (uma por linha)</span><textarea name="features" defaultValue={v?.features.join("\n")} rows={4} className="input" /></label>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-bold">Imagem</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Enviar foto (JPG, PNG ou WEBP, até 4 MB)</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="input" /></label>
          <label><span className="label">ou URL da imagem (https://)</span><input name="imageUrl" defaultValue={v?.imageUrl ?? ""} className="input" /></label>
          <label className="sm:col-span-2"><span className="label">Legenda obrigatória</span><input name="imageCaption" defaultValue={v?.imageCaption ?? "Imagem ilustrativa de modelo similar"} required className="input" /><span className="hint block">Use fotos de veículos específicos apenas quando houver disponibilidade real. Caso contrário, identifique como imagem ilustrativa.</span></label>
        </div>
        {v?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.imageUrl} alt="" className="h-32 rounded-lg object-cover" />
        )}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-bold">Plano, quilometragem e condições</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label><span className="label">Quilometragem contratada (km/mês)</span><input name="kmPerMonth" type="number" min={0} defaultValue={v?.kmPerMonth ?? 5000} required className="input" /></label>
          <fieldset><legend className="label">Prazos disponíveis</legend><div className="flex gap-3 pt-2">{[12, 24, 36].map((t) => <label key={t} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name={`term${t}`} defaultChecked={v ? v.terms.includes(t) : true} className="accent-brand-700" />{t} meses</label>)}</div></fieldset>
          <label><span className="label">Disponibilidade</span><select name="availability" defaultValue={v?.availability ?? "ON_REQUEST"} className="input"><option value="AVAILABLE">Disponível para reserva (confirmada)</option><option value="ON_REQUEST">Sob consulta</option><option value="UNAVAILABLE">Indisponível</option></select></label>
        </div>
        <label className="block"><span className="label">Condições</span><textarea name="conditions" defaultValue={v?.conditions} rows={3} className="input" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Proteção (somente se confirmada)</span><input name="protectionInfo" defaultValue={v?.protectionInfo ?? ""} className="input" placeholder="Deixe em branco se não confirmado" /></label>
          <label><span className="label">Manutenção (somente se confirmada)</span><input name="maintenanceInfo" defaultValue={v?.maintenanceInfo ?? ""} className="input" placeholder="Deixe em branco se não confirmado" /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={v?.active ?? true} className="accent-brand-700" /> Veículo ativo no catálogo</label>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-sm font-bold">Precificação</h2>
        <div className="rounded-lg bg-surface p-3 text-sm">
          Preço publicado: <strong>{v?.priceValidatedAt ? formatMoney(v.finalPriceCents) : "nenhum"}</strong>
          {v?.priceValidatedAt && <span className="text-muted"> · validado por {v.priceValidatedBy} em {new Date(v.priceValidatedAt).toLocaleDateString("pt-BR")}</span>}
          {v?.suggestedCents != null && <span className="ml-2 badge bg-amber-100 text-amber-900">Pendente: {formatMoney(v.suggestedCents)}</span>}
        </div>
        <fieldset className="flex flex-wrap gap-3">
          <legend className="label">Modo</legend>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="pricingMode" value="MANUAL" checked={mode === "MANUAL"} onChange={() => setMode("MANUAL")} className="accent-brand-700" /> Manual (definir preço final)</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="pricingMode" value="REFERENCE" checked={mode === "REFERENCE"} onChange={() => setMode("REFERENCE")} className="accent-brand-700" /> Por referência de mercado</label>
        </fieldset>
        {mode === "MANUAL" ? (
          <label className="block max-w-xs"><span className="label">Preço mensal final proposto (R$)</span><input name="proposedPrice" defaultValue={centsToInput(v?.suggestedCents ?? v?.finalPriceCents)} className="input" inputMode="decimal" /></label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-4">
            <label><span className="label">Valor de referência (R$/mês)</span><input name="referencePrice" value={ref} onChange={(e) => setRef(e.target.value)} className="input" inputMode="decimal" /></label>
            <label><span className="label">Desconto de posicionamento (%)</span><input name="discountPercent" type="number" step="0.5" min={0} max={90} value={disc} onChange={(e) => setDisc(e.target.value)} className="input" /></label>
            <label><span className="label">Data da cotação</span><input name="referenceDate" type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} className="input" /></label>
            <div className="rounded-lg bg-brand-50 p-3 text-sm"><p className="text-xs text-muted">Preço sugerido</p><p className="text-lg font-bold">{preview ? formatMoney(preview) : "—"}</p><p className="text-[11px] text-muted">= referência × {(1 - Number(disc) / 100).toFixed(2)}</p></div>
            <label className="sm:col-span-4"><span className="label">Fonte da referência</span><input name="referenceSource" defaultValue={v?.referenceSource ?? ""} className="input" placeholder="Ex.: cotação pública da locadora X para categoria comparável, plano 12 meses, consultada em dd/mm/aaaa" /><span className="hint block">Use apenas cotações reais e recentes. Referências com mais de {REFERENCE_MAX_AGE_DAYS} dias são sinalizadas.</span></label>
            {stale && <p className="sm:col-span-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Esta referência tem mais de {REFERENCE_MAX_AGE_DAYS} dias e pode estar desatualizada. <label className="ml-2 inline-flex items-center gap-1"><input type="checkbox" name="confirmStale" className="accent-amber-600" /> Confirmo a publicação mesmo assim</label></p>}
          </div>
        )}
        {mode === "MANUAL" && <input type="hidden" name="discountPercent" value={disc} />}
        <label className="flex items-start gap-2 rounded-lg border border-line p-3 text-sm"><input type="checkbox" name="publishPrice" className="mt-0.5 accent-brand-700" /> <span><strong>Validar e publicar este preço.</strong> Sem esta confirmação, o novo valor fica pendente e o preço atualmente publicado é mantido.</span></label>
      </section>

      <div className="flex justify-end"><Submit>Salvar veículo</Submit></div>
    </ActionForm>
  );
}
