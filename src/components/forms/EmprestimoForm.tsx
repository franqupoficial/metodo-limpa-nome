"use client";

import { useMemo, useState } from "react";
import { emprestimoSchema, personalSchema, addressSchema, DUE_DAYS } from "@/lib/schemas";
import { formatMoney } from "@/lib/format";
import { Checkbox, FormAlert, RadioCards, ReviewSection, Stepper, TextField, WizardNav } from "./kit";
import { AddressFields, BaseConsentFields, Confirmation, PersonalFields, emptyAddress, emptyConsents, emptyPersonal, submitRequest } from "./shared";
import { useWizard, validateWith } from "./useWizard";
import { Notice } from "@/components/ui";

const STEPS = ["Dados pessoais", "Endereço", "Valor e vencimento", "Revisão e consentimentos"];

export function EmprestimoForm({ minCents, maxCents }: { minCents: number; maxCents: number }) {
  const schema = useMemo(() => emprestimoSchema(maxCents, minCents), [maxCents, minCents]);
  const w = useWizard(STEPS.length);
  const [personal, setPersonal] = useState(emptyPersonal);
  const [address, setAddress] = useState(emptyAddress);
  const [loan, setLoan] = useState({ amount: Math.min(150000, maxCents) / 100, dueDay: "", purpose: "", monthlyIncome: "" });
  const [consents, setConsents] = useState({ ...emptyConsents, creditAnalysis: false, noGuarantee: false });
  const [done, setDone] = useState<{ protocol: string; accessCode: string } | null>(null);

  if (done)
    return (
      <Confirmation {...done}>
        <p>Sua proposta será submetida à análise. Caso aprovada, você receberá as condições completas — valor, parcelas, juros, CET, encargos e vencimentos — antes de qualquer contratação. <strong>Nunca solicitamos pagamento antecipado para liberar crédito.</strong></p>
      </Confirmation>
    );

  const loanPayload = () => ({ ...loan, dueDay: Number(loan.dueDay), monthlyIncome: loan.monthlyIncome ? Number(loan.monthlyIncome.replace(/\./g, "").replace(",", ".")) : undefined });

  async function next() {
    if (w.step === 0) return w.advance(validateWith(personalSchema, personal, "personal"));
    if (w.step === 1) return w.advance(validateWith(addressSchema, address, "address"));
    if (w.step === 2) return w.advance(validateWith(schema.shape.loan, loanPayload(), "loan"));
    const payload = { personal, address, loan: loanPayload(), consents };
    if (!w.advance(validateWith(schema, payload, ""))) return;
    w.setSubmitting(true);
    const r = await submitRequest("emprestimo", payload);
    w.setSubmitting(false);
    if (r.ok) setDone({ protocol: r.protocol, accessCode: r.accessCode });
    else { w.setFormError(r.error); if (r.fieldErrors) w.setErrors(r.fieldErrors); }
  }

  return (
    <div>
      <Stepper steps={STEPS} current={w.step} />
      {w.formError && <FormAlert message={w.formError} />}
      {w.step === 0 && <PersonalFields value={personal} onChange={setPersonal} errors={w.errors} />}
      {w.step === 1 && <AddressFields value={address} onChange={setAddress} errors={w.errors} />}
      {w.step === 2 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <label htmlFor="valor-range" className="label">Valor solicitado</label>
            <p className="text-3xl font-extrabold text-brand-800">{formatMoney(Math.round(loan.amount * 100))}</p>
            <input id="valor-range" type="range" min={minCents / 100} max={maxCents / 100} step={50} value={loan.amount} onChange={(e) => setLoan({ ...loan, amount: Number(e.target.value) })} className="mt-4 w-full accent-brand-700" aria-valuetext={formatMoney(Math.round(loan.amount * 100))} />
            <div className="flex justify-between text-xs text-muted"><span>{formatMoney(minCents)}</span><span>{formatMoney(maxCents)}</span></div>
            {w.errors["loan.amount"] && <p className="field-error">{w.errors["loan.amount"]}</p>}
          </div>
          <RadioCards legend="Data de vencimento desejada (dia do mês)" value={loan.dueDay} onChange={(v) => setLoan({ ...loan, dueDay: v })} error={w.errors["loan.dueDay"]} columns={3}
            options={DUE_DAYS.map((d) => ({ value: String(d), label: `Dia ${d}` }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Renda mensal aproximada (R$)" required={false} value={loan.monthlyIncome} onChange={(v) => setLoan({ ...loan, monthlyIncome: v.replace(/[^\d,.]/g, "") })} inputMode="decimal" hint="Ajuda na análise. Opcional." />
            <TextField label="Finalidade do crédito" required={false} value={loan.purpose} onChange={(v) => setLoan({ ...loan, purpose: v })} maxLength={300} />
          </div>
          <Notice tone="info">O valor e a data informados são uma preferência. As condições finais — número de parcelas, juros, Custo Efetivo Total (CET) e vencimentos — são apresentadas após a análise, antes da contratação.</Notice>
        </div>
      )}
      {w.step === 3 && (
        <div className="space-y-5">
          <ReviewSection title="Dados pessoais" onEdit={() => w.go(0)} rows={[["Nome", personal.fullName], ["CPF", personal.cpf], ["Nascimento", personal.birthDate.split("-").reverse().join("/")], ["Telefone", personal.phone], ["E-mail", personal.email]]} />
          <ReviewSection title="Endereço" onEdit={() => w.go(1)} rows={[["CEP", address.cep], ["Endereço", `${address.street}, ${address.number} ${address.complement}`], ["Bairro", address.district], ["Cidade/UF", `${address.city}/${address.state}`]]} />
          <ReviewSection title="Proposta" onEdit={() => w.go(2)} rows={[["Valor solicitado", formatMoney(Math.round(loan.amount * 100))], ["Vencimento", loan.dueDay ? `Dia ${loan.dueDay}` : ""], ["Renda informada", loan.monthlyIncome ? `R$ ${loan.monthlyIncome}` : ""], ["Finalidade", loan.purpose]]} />
          <Notice tone="warn" title="Leia antes de enviar">
            A solicitação está sujeita à análise, elegibilidade, aprovação e contratação. Em caso de inadimplemento, podem incidir juros de mora, multa contratual (limitada a 2% conforme o CDC), cobrança dos valores devidos e, após notificação prévia, inclusão em cadastros de proteção ao crédito, conforme a legislação e o contrato.
          </Notice>
          <div className="space-y-2">
            <BaseConsentFields value={consents} onChange={setConsents} errors={w.errors} />
            <Checkbox required checked={consents.creditAnalysis} onChange={(v) => setConsents({ ...consents, creditAnalysis: v })} error={w.errors["consents.creditAnalysis"]}>
              Autorizo a consulta e a análise das minhas informações de crédito, inclusive em birôs de crédito e no Sistema de Informações de Crédito (SCR) do Banco Central, para avaliação desta proposta.
            </Checkbox>
            <Checkbox required checked={consents.noGuarantee} onChange={(v) => setConsents({ ...consents, noGuarantee: v })} error={w.errors["consents.noGuarantee"]}>
              Compreendo que a aprovação não é garantida e que nenhum valor deve ser pago antecipadamente para liberação de crédito.
            </Checkbox>
          </div>
        </div>
      )}
      <WizardNav step={w.step} total={STEPS.length} onBack={w.back} onNext={next} submitting={w.submitting} />
    </div>
  );
}
