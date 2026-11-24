"use client";

import type { PixData } from "@/components/PixPayment";
import { useMemo, useState } from "react";
import { emprestimoSchema, personalSchema, addressSchema, DUE_DAYS, LOAN_PAYMENT_LABEL, LOAN_PAYMENT_METHODS } from "@/lib/schemas";
import { formatMoney } from "@/lib/format";
import { Checkbox, FormAlert, RadioCards, ReviewSection, SelectField, Stepper, TextField, WizardNav } from "./kit";
import { AddressFields, BaseConsentFields, Confirmation, PersonalFields, emptyAddress, emptyConsents, emptyPersonal, submitRequest } from "./shared";
import { useWizard, validateWith } from "./useWizard";
import { Notice } from "@/components/ui";

const STEPS = ["Cadastro", "Endereço", "Valor, vencimento e pagamento", "Revisão e autorizações"];

export function EmprestimoForm({ minCents, maxCents }: { minCents: number; maxCents: number }) {
  const schema = useMemo(() => emprestimoSchema(maxCents, minCents), [maxCents, minCents]);
  const w = useWizard(STEPS.length);
  const [personal, setPersonal] = useState(emptyPersonal);
  const [address, setAddress] = useState(emptyAddress);
  const [loan, setLoan] = useState({ amount: Math.min(150000, maxCents) / 100, dueDay: "", purpose: "", monthlyIncome: "", paymentMethod: "" as "" | (typeof LOAN_PAYMENT_METHODS)[number] });
  const [bank, setBank] = useState({ bankName: "", agency: "", account: "", accountType: "" as "" | "CORRENTE" | "POUPANCA" });
  const [consents, setConsents] = useState({ ...emptyConsents, creditAnalysis: false, autoDebit: false, noGuarantee: false });
  const [done, setDone] = useState<{ protocol: string; accessCode: string; pix: PixData | null } | null>(null);

  if (done)
    return (
      <Confirmation {...done} title="Pedido de empréstimo recebido.">
        <p>Próximos passos: aprovação da proposta, envio das condições e do contrato ao seu e-mail em até 24 horas e liberação do valor. As parcelas chegam por e-mail (Pix ou boleto) antes de cada vencimento. <strong>Nunca solicitamos pagamento antecipado para liberar crédito.</strong></p>
      </Confirmation>
    );

  const loanPayload = () => ({ ...loan, bank: loan.paymentMethod === "DEBITO_CONTA" ? bank : undefined, dueDay: Number(loan.dueDay), monthlyIncome: loan.monthlyIncome ? Number(loan.monthlyIncome.replace(/\./g, "").replace(",", ".")) : undefined });

  async function next() {
    if (w.step === 0) return w.advance(validateWith(personalSchema, personal, "personal"));
    if (w.step === 1) return w.advance(validateWith(addressSchema, address, "address"));
    if (w.step === 2) return w.advance(validateWith(schema.shape.loan, loanPayload(), "loan"));
    const payload = { personal, address, loan: loanPayload(), consents };
    if (!w.advance(validateWith(schema, payload, ""))) return;
    w.setSubmitting(true);
    const r = await submitRequest("emprestimo", payload);
    w.setSubmitting(false);
    if (r.ok) setDone({ protocol: r.protocol, accessCode: r.accessCode, pix: r.pix });
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
            <TextField label="Renda mensal aproximada (R$)" required={false} value={loan.monthlyIncome} onChange={(v) => setLoan({ ...loan, monthlyIncome: v.replace(/[^\d,.]/g, "") })} inputMode="decimal" hint="Opcional. Agiliza a aprovação." />
            <TextField label="Finalidade do crédito" required={false} value={loan.purpose} onChange={(v) => setLoan({ ...loan, purpose: v })} maxLength={300} />
          </div>
          <RadioCards legend="Forma de pagamento das parcelas" value={loan.paymentMethod} onChange={(v) => setLoan({ ...loan, paymentMethod: v })} error={w.errors["loan.paymentMethod"]}
            options={LOAN_PAYMENT_METHODS.map((m) => ({ value: m, label: LOAN_PAYMENT_LABEL[m], description: m === "DEBITO_CONTA" ? "Debitado automaticamente no dia de vencimento escolhido." : "Enviado ao seu e-mail antes do dia de vencimento escolhido." }))} />
          {loan.paymentMethod === "DEBITO_CONTA" && (
            <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2">
              <TextField label="Banco" value={bank.bankName} onChange={(v) => setBank({ ...bank, bankName: v })} error={w.errors["loan.bank.bankName"]} placeholder="Ex.: Caixa, Itaú, Nubank" maxLength={60} />
              <SelectField label="Tipo de conta" value={bank.accountType} onChange={(v) => setBank({ ...bank, accountType: v as typeof bank.accountType })} error={w.errors["loan.bank.accountType"]} options={[{ value: "CORRENTE", label: "Conta corrente" }, { value: "POUPANCA", label: "Conta poupança" }]} />
              <TextField label="Agência (sem dígito)" value={bank.agency} onChange={(v) => setBank({ ...bank, agency: v.replace(/\D/g, "").slice(0, 5) })} error={w.errors["loan.bank.agency"]} inputMode="numeric" />
              <TextField label="Conta com dígito" value={bank.account} onChange={(v) => setBank({ ...bank, account: v.replace(/[^\dxX-]/g, "").slice(0, 15) })} error={w.errors["loan.bank.account"]} placeholder="Ex.: 123456-7" />
              <p className="text-xs text-muted sm:col-span-2">A conta deve estar no seu nome (mesmo CPF do cadastro). Nunca pedimos senha, token ou dados de cartão.</p>
            </div>
          )}
          <Notice tone="info">Nenhum pagamento é feito agora. As parcelas começam depois da liberação do crédito, na data que você escolher.</Notice>
        </div>
      )}
      {w.step === 3 && (
        <div className="space-y-5">
          <ReviewSection title="Dados pessoais" onEdit={() => w.go(0)} rows={[["Nome", personal.fullName], ["CPF", personal.cpf], ["Nascimento", personal.birthDate.split("-").reverse().join("/")], ["Telefone", personal.phone], ["E-mail", personal.email]]} />
          <ReviewSection title="Endereço" onEdit={() => w.go(1)} rows={[["CEP", address.cep], ["Endereço", `${address.street}, ${address.number} ${address.complement}`], ["Bairro", address.district], ["Cidade/UF", `${address.city}/${address.state}`]]} />
          <ReviewSection title="Proposta" onEdit={() => w.go(2)} rows={[["Valor solicitado", formatMoney(Math.round(loan.amount * 100))], ["Vencimento", loan.dueDay ? `Dia ${loan.dueDay}` : ""], ["Pagamento", loan.paymentMethod ? LOAN_PAYMENT_LABEL[loan.paymentMethod] : ""], ...(loan.paymentMethod === "DEBITO_CONTA" ? [["Conta para débito", `${bank.bankName} · ag. ${bank.agency} · ${bank.account}`] as [string, string]] : []), ["Renda informada", loan.monthlyIncome ? `R$ ${loan.monthlyIncome}` : ""], ["Finalidade", loan.purpose]]} />
          <Notice tone="warn" title="Leia antes de enviar">
            O valor final, as parcelas e o CET são definidos na aprovação e constam do contrato enviado por e-mail. O crédito é liberado após a assinatura do contrato. Em caso de inadimplemento, podem incidir juros de mora, multa contratual (limitada a 2% conforme o CDC), cobrança dos valores devidos e, após notificação prévia, inclusão em cadastros de proteção ao crédito, conforme a legislação e o contrato.
          </Notice>
          <div className="space-y-2">
            <BaseConsentFields value={consents} onChange={setConsents} errors={w.errors} />
            <Checkbox required checked={consents.creditAnalysis} onChange={(v) => setConsents({ ...consents, creditAnalysis: v })} error={w.errors["consents.creditAnalysis"]}>
              Autorizo a consulta das minhas informações de crédito, inclusive em birôs de crédito e no Sistema de Informações de Crédito (SCR) do Banco Central, para aprovação desta proposta.
            </Checkbox>
            <Checkbox required checked={consents.autoDebit} onChange={(v) => setConsents({ ...consents, autoDebit: v })} error={w.errors["consents.autoDebit"]}>
              {loan.paymentMethod === "DEBITO_CONTA" ? "Autorizo, após a assinatura do contrato, o débito automático das parcelas na conta informada, no dia de vencimento indicado, nos termos do contrato." : "Autorizo, após a assinatura do contrato, o envio mensal das cobranças das parcelas ao meu e-mail, na forma de pagamento escolhida, para pagamento até o dia de vencimento indicado."}
            </Checkbox>
            <Checkbox required checked={consents.noGuarantee} onChange={(v) => setConsents({ ...consents, noGuarantee: v })} error={w.errors["consents.noGuarantee"]}>
              Compreendo que solicitação, aprovação e liberação são etapas distintas, e que nenhum valor deve ser pago antecipadamente para liberação de crédito.
            </Checkbox>
          </div>
        </div>
      )}
      <WizardNav step={w.step} total={STEPS.length} onBack={w.back} onNext={next} submitting={w.submitting} submitLabel="Enviar pedido de empréstimo" />
    </div>
  );
}
