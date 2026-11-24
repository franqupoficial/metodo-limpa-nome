import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { formatMoney } from "@/lib/format";
import { referenceIsStale, simulate } from "@/lib/pricing";
import { centsToInput } from "@/lib/action";
import { AdminHeader, Panel, Empty } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { saveCategoryAction, saveLvbPlansAction, saveServicePricesAction } from "../../_actions/settings";
import { discardSuggestionAction, validatePriceAction } from "../../_actions/vehicles";

export const metadata = { title: "Tarifas" };

const INCL = [["INCLUDED", "Incluído no plano"], ["NOT_INCLUDED", "Não incluído"], ["TO_CONFIRM", "Confirmado na proposta"]];

export default async function Tarifas() {
  const admin = await requireAdmin();
  const [categories, pending, plans, inc, costs, cons, cnpj, loan] = await Promise.all([
    prisma.vehicleCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { vehicles: true } } } }),
    prisma.vehicle.findMany({ where: { suggestedCents: { not: null } }, include: { category: true } }),
    getSetting("lvb.plans"), getSetting("lvb.inclusions"), getSetting("lvb.costs"),
    getSetting("service.consumidor"), getSetting("service.cnpj"), getSetting("service.emprestimo"),
  ]);
  const example = simulate({ baseMonthlyCents: categories[0]?.startingCents ?? 144000, termMonths: 12, termAdjustments: plans.termAdjustments });

  return (
    <>
      <AdminHeader title="Tarifas" subtitle="Preços, categorias, prazos e condições. Alterações de preço de veículos só são publicadas após validação." />

      <Panel title={`Preços aguardando validação (${pending.length})`} className="mb-6">
        <div id="pendentes" />
        {pending.length ? (
          <div className="overflow-x-auto">
            <table className="table-portal">
              <thead><tr><th>Veículo</th><th>Atual</th><th>Proposto</th><th>Origem</th><th></th></tr></thead>
              <tbody>
                {pending.map((v) => {
                  const stale = v.pricingMode === "REFERENCE" && referenceIsStale(v.referenceDate);
                  return (
                    <tr key={v.id}>
                      <td><Link href={`/admin/veiculos/${v.id}`}>{v.brand} {v.name}</Link><span className="block text-xs text-muted">{v.category.name}</span></td>
                      <td className="text-xs">{v.priceValidatedAt ? formatMoney(v.finalPriceCents) : "—"}</td>
                      <td className="text-xs font-semibold">{formatMoney(v.suggestedCents)}</td>
                      <td className="text-xs">{v.pricingMode === "REFERENCE" ? <>Ref. {formatMoney(v.referencePriceCents)} −{v.discountPercent}% · {v.referenceSource}{stale && <span className="block font-semibold text-amber-700">Referência desatualizada</span>}</> : "Manual"}</td>
                      <td className="space-y-1">
                        <ActionForm action={validatePriceAction}><input type="hidden" name="id" value={v.id} />{stale && <label className="mb-1 flex items-center gap-1 text-[11px]"><input type="checkbox" name="confirmStale" /> confirmo</label>}<Submit className="btn-primary btn-sm">Validar e publicar</Submit></ActionForm>
                        <ActionForm action={discardSuggestionAction}><input type="hidden" name="id" value={v.id} /><Submit className="btn-ghost btn-sm">Descartar</Submit></ActionForm>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Empty>Nenhum preço pendente.</Empty>}
      </Panel>

      <Panel title="Categorias LVB" className="mb-6">
        <p className="mb-4 text-sm text-muted">O valor “a partir de” exibido no site usa o menor preço publicado entre os veículos da categoria; o valor inicial abaixo é usado quando a categoria ainda não possui veículos publicados.</p>
        <div className="space-y-3">
          {[...categories, null].map((c) => (
            <ActionForm key={c?.id ?? "new"} action={saveCategoryAction} resetOnSuccess={!c} className={`grid items-end gap-2 rounded-lg border border-line p-3 md:grid-cols-12 ${!c ? "border-dashed" : ""}`}>
              {c && <input type="hidden" name="id" value={c.id} />}
              <label className="md:col-span-2"><span className="label text-xs">{c ? "Categoria" : "Nova categoria"}</span><input name="name" defaultValue={c?.name} className="input" required /></label>
              <label className="md:col-span-3"><span className="label text-xs">Modelos de referência</span><input name="referenceModels" defaultValue={c?.referenceModels} className="input" /></label>
              <label className="md:col-span-3"><span className="label text-xs">Descrição</span><input name="description" defaultValue={c?.description} className="input" /></label>
              <label className="md:col-span-2"><span className="label text-xs">Valor inicial (R$/mês)</span><input name="starting" defaultValue={centsToInput(c?.startingCents)} className="input" required /></label>
              <label className="md:col-span-1"><span className="label text-xs">Ordem</span><input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? categories.length} className="input" /></label>
              <div className="flex items-center gap-2 md:col-span-1"><label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} />Ativa</label></div>
              <div className="md:col-span-12 flex items-center justify-between text-xs text-muted">{c ? `${c._count.vehicles} veículo(s)` : ""}<Submit className="btn-secondary btn-sm">{c ? "Salvar" : "Adicionar"}</Submit></div>
            </ActionForm>
          ))}
        </div>
      </Panel>

      <Panel title="Planos LVB: prazos, quilometragem, inclusões e custos" className="mb-6">
        <ActionForm action={saveLvbPlansAction} className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Ajuste sobre o valor mensal por prazo (%)</h3>
            <div className="grid max-w-lg grid-cols-3 gap-3">
              {[12, 24, 36].map((t) => <label key={t}><span className="label text-xs">{t} meses</span><input name={`adj${t}`} defaultValue={plans.termAdjustments[String(t)] ?? 0} className="input" inputMode="decimal" /></label>)}
            </div>
            <p className="hint">Ex.: −5 aplica 5% de redução no plano de 36 meses. Exemplo atual: 12 meses, {formatMoney(example.monthlyCents)}/mês → total {formatMoney(example.totalCents)}.</p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Pacotes de quilometragem (opcional)</h3>
            <p className="hint mb-2">Sem pacotes, o simulador exibe a franquia de cada veículo.</p>
            <div className="grid gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="grid max-w-xl grid-cols-3 gap-2">
                  <input name={`km${i}label`} defaultValue={plans.kmPackages[i]?.label} className="input col-span-2" placeholder="Ex.: Até 6.000 km/mês" aria-label={`Pacote ${i + 1}`} />
                  <input name={`km${i}pct`} defaultValue={plans.kmPackages[i]?.surchargePercent} className="input" placeholder="Acréscimo %" aria-label={`Acréscimo do pacote ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Itens incluídos (configure conforme a operação real)</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              {([["maintenance", "Manutenção"], ["ipva", "IPVA / licenciamento"], ["insurance", "Proteção / seguro"], ["assistance", "Assistência 24h"]] as const).map(([k, l]) => (
                <label key={k}><span className="label text-xs">{l}</span><select name={k} defaultValue={inc[k]} className="input">{INCL.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
              ))}
            </div>
            <label className="mt-3 block"><span className="label text-xs">Observação sobre inclusões</span><input name="inclusionNotes" defaultValue={inc.notes} className="input" /></label>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Custos adicionais informados ao cliente</h3>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[200px_1fr]">
                  <input name={`cost${i}label`} defaultValue={costs[i]?.label} className="input" placeholder="Ex.: Caução" aria-label={`Custo ${i + 1}`} />
                  <input name={`cost${i}desc`} defaultValue={costs[i]?.description} className="input" placeholder="Descrição clara do custo e quando se aplica" aria-label={`Descrição do custo ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>
          <label className="block"><span className="label text-xs">Aviso de preços exibido no site</span><textarea name="priceNotice" defaultValue={plans.priceNotice} rows={2} className="input" /></label>
          <Submit>Salvar planos LVB</Submit>
        </ActionForm>
      </Panel>

      {admin.role === "ADMIN" && (
        <Panel title="Valores dos serviços">
          <ActionForm action={saveServicePricesAction} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label><span className="label text-xs">Consumidor — Pix à vista (R$)</span><input name="pix" defaultValue={centsToInput(cons.pixCents)} className="input" /></label>
              <label><span className="label text-xs">Consumidor — parcelado (R$)</span><input name="installment" defaultValue={centsToInput(cons.installmentCents)} className="input" /></label>
              <label><span className="label text-xs">Consumidor — máx. parcelas</span><input name="maxInstallments" type="number" min={1} max={24} defaultValue={cons.maxInstallments} className="input" /></label>
              <label><span className="label text-xs">Abra seu CNPJ (R$)</span><input name="cnpj" defaultValue={centsToInput(cnpj.priceCents)} className="input" /></label>
              <label><span className="label text-xs">Empréstimo — mínimo (R$)</span><input name="loanMin" defaultValue={centsToInput(loan.minCents)} className="input" /></label>
              <label><span className="label text-xs">Empréstimo — máximo (R$)</span><input name="loanMax" defaultValue={centsToInput(loan.maxCents)} className="input" /></label>
            </div>
            <label className="block"><span className="label text-xs">Escopo do serviço Consumidor</span><textarea name="scope" defaultValue={cons.scope} rows={3} className="input" /></label>
            <Submit>Salvar valores</Submit>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
