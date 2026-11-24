"use client";

import { useState } from "react";
import { consumidorSchema, personalSchema, addressSchema } from "@/lib/schemas";
import { formatMoney } from "@/lib/format";
import { Checkbox, FormAlert, RadioCards, ReviewSection, Stepper, TextArea, WizardNav } from "./kit";
import { AddressFields, BaseConsentFields, Confirmation, PersonalFields, emptyAddress, emptyConsents, emptyPersonal, submitRequest } from "./shared";
import { useWizard, validateWith } from "./useWizard";
import { Notice } from "@/components/ui";

const STEPS = ["Dados pessoais", "Endereço", "Registros", "Revisão e consentimentos"];

export function ConsumidorForm({ pixCents, installmentCents, maxInstallments, scope }: { pixCents: number; installmentCents: number; maxInstallments: number; scope: string }) {
  const w = useWizard(STEPS.length);
  const [personal, setPersonal] = useState(emptyPersonal);
  const [address, setAddress] = useState(emptyAddress);
  const [records, setRecords] = useState({ description: "", creditors: "", alreadyContested: "" as "" | "SIM" | "NAO" | "NAO_SEI" });
  const [payment, setPayment] = useState({ preference: "" as "" | "PIX" | "PARCELADO" });
  const [consents, setConsents] = useState({ ...emptyConsents, scope: false });
  const [done, setDone] = useState<{ protocol: string; accessCode: string } | null>(null);

  if (done) return <Confirmation {...done}><p>A solicitação estará sujeita à análise. Nossa equipe entrará em contato pelos canais informados com as orientações e instruções de pagamento pelos canais oficiais do portal.</p></Confirmation>;

  async function next() {
    if (w.step === 0) return w.advance(validateWith(personalSchema, personal, "personal"));
    if (w.step === 1) return w.advance(validateWith(addressSchema, address, "address"));
    if (w.step === 2) return w.advance(validateWith(consumidorSchema.shape.records, records, "records"));
    const payload = { personal, address, records, payment, consents };
    const errs = validateWith(consumidorSchema, payload, "");
    if (!w.advance(errs)) return;
    w.setSubmitting(true);
    const r = await submitRequest("consumidor", payload);
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
        <div className="space-y-4">
          <TextArea label="Informações relevantes sobre os registros" hint="Ex.: quais registros aparecem, valores, datas, se reconhece a dívida, se já pagou, se recebeu notificação prévia." value={records.description} onChange={(v) => setRecords({ ...records, description: v })} error={w.errors["records.description"]} rows={5} maxLength={3000} />
          <TextArea label="Empresas credoras (se souber)" required={false} value={records.creditors} onChange={(v) => setRecords({ ...records, creditors: v })} rows={2} maxLength={500} />
          <RadioCards legend="Você já contestou esses registros anteriormente?" value={records.alreadyContested} onChange={(v) => setRecords({ ...records, alreadyContested: v })} error={w.errors["records.alreadyContested"]} columns={3}
            options={[{ value: "SIM", label: "Sim" }, { value: "NAO", label: "Não" }, { value: "NAO_SEI", label: "Não sei" }]} />
          <Notice tone="info">Não envie senhas, fotos de cartão ou dados bancários. Documentos complementares, se necessários, serão solicitados pela equipe por canal seguro.</Notice>
        </div>
      )}
      {w.step === 3 && (
        <div className="space-y-5">
          <ReviewSection title="Dados pessoais" onEdit={() => w.go(0)} rows={[["Nome", personal.fullName], ["CPF", personal.cpf], ["Nascimento", personal.birthDate.split("-").reverse().join("/")], ["Telefone", personal.phone], ["E-mail", personal.email]]} />
          <ReviewSection title="Endereço" onEdit={() => w.go(1)} rows={[["CEP", address.cep], ["Endereço", `${address.street}, ${address.number} ${address.complement}`], ["Bairro", address.district], ["Cidade/UF", `${address.city}/${address.state}`]]} />
          <ReviewSection title="Registros" onEdit={() => w.go(2)} rows={[["Descrição", records.description], ["Credores", records.creditors]]} />
          <RadioCards legend="Forma de pagamento preferida" value={payment.preference} onChange={(v) => setPayment({ preference: v })} error={w.errors["payment.preference"]}
            options={[
              { value: "PIX", label: `${formatMoney(pixCents)} à vista via Pix` },
              { value: "PARCELADO", label: `${formatMoney(installmentCents)} parcelado`, description: `Em até ${maxInstallments}x, conforme condições informadas na contratação.` },
            ]} />
          <Notice tone="warn" title="Escopo do serviço">
            {scope} O serviço não garante remoção de registros, aumento de score ou eliminação de dívidas legítimas. O pagamento só será solicitado após a confirmação, pelos canais oficiais do portal.
          </Notice>
          <div className="space-y-2">
            <BaseConsentFields value={consents} onChange={setConsents} errors={w.errors} />
            <Checkbox required checked={consents.scope} onChange={(v) => setConsents({ ...consents, scope: v })} error={w.errors["consents.scope"]}>
              Compreendo que se trata de um serviço privado de análise administrativa, sem garantia de resultado, e que posso contestar registros gratuitamente pelos canais oficiais.
            </Checkbox>
          </div>
        </div>
      )}
      <WizardNav step={w.step} total={STEPS.length} onBack={w.back} onNext={next} submitting={w.submitting} />
    </div>
  );
}
