"use client";

import type { PixData } from "@/components/PixPayment";
import { useState } from "react";
import { cnpjSchema, OPERATION_MODES, addressSchema } from "@/lib/schemas";
import { formatMoney } from "@/lib/format";
import { Checkbox, FormAlert, RadioCards, ReviewSection, SelectField, Stepper, TextArea, TextField, WizardNav } from "./kit";
import { AddressFields, BaseConsentFields, Confirmation, PersonalFields, emptyAddress, emptyConsents, emptyPersonal, submitRequest } from "./shared";
import { useWizard, validateWith } from "./useWizard";
import { Notice } from "@/components/ui";

const STEPS = ["Dados pessoais", "Endereço", "Dados empresariais", "Revisão", "Contratação"];
const TYPE_LABEL: Record<string, string> = { MEI: "MEI — Microempreendedor Individual", ME: "ME — Microempresa", EPP: "EPP — Empresa de Pequeno Porte", NAO_SEI: "Ainda não sei / quero orientação" };

export function CnpjForm({ priceCents }: { priceCents: number }) {
  const w = useWizard(STEPS.length);
  const [personal, setPersonal] = useState({ ...emptyPersonal, idDocType: "" as "" | "RG" | "CNH" | "OUTRO", idDocNumber: "" });
  const [address, setAddress] = useState(emptyAddress);
  const [business, setBusiness] = useState({
    tradeName: "", mainActivity: "", secondaryActivities: "", businessType: "" as "" | "MEI" | "ME" | "EPP" | "NAO_SEI",
    operationModes: [] as (typeof OPERATION_MODES)[number][], sameAddress: true, businessAddress: "", initialCapital: "",
  });
  const [consents, setConsents] = useState({ ...emptyConsents, privateFee: false });
  const [done, setDone] = useState<{ protocol: string; accessCode: string; pix: PixData | null } | null>(null);

  if (done) return <Confirmation {...done} title="Contratação registrada." pixTitle="Pague via Pix para iniciar a abertura do CNPJ"><p>Confirmado o pagamento, nossa equipe inicia a abertura do seu CNPJ e entra em contato para validar enquadramento e atividades.</p></Confirmation>;

  const payload = () => ({ personal, address, business: { ...business, initialCapital: business.initialCapital === "" ? 0 : Number(business.initialCapital.replace(/\./g, "").replace(",", ".")) }, consents });
  const shape = cnpjSchema.shape;

  async function next() {
    if (w.step === 0) return w.advance(validateWith(shape.personal, personal, "personal"));
    if (w.step === 1) return w.advance(validateWith(addressSchema, address, "address"));
    if (w.step === 2) return w.advance(validateWith(shape.business, payload().business, "business"));
    if (w.step === 3) return w.advance(validateWith(shape.consents, consents, "consents"));
    const errs = validateWith(cnpjSchema, payload(), "");
    if (!w.advance(errs)) return;
    w.setSubmitting(true);
    const r = await submitRequest("cnpj", payload());
    w.setSubmitting(false);
    if (r.ok) setDone({ protocol: r.protocol, accessCode: r.accessCode, pix: r.pix });
    else { w.setFormError(r.error); if (r.fieldErrors) w.setErrors(r.fieldErrors); }
  }

  const toggleMode = (m: (typeof OPERATION_MODES)[number]) =>
    setBusiness((b) => ({ ...b, operationModes: b.operationModes.includes(m) ? b.operationModes.filter((x) => x !== m) : [...b.operationModes, m] }));

  return (
    <div>
      <Stepper steps={STEPS} current={w.step} />
      {w.formError && <FormAlert message={w.formError} />}
      {w.step === 0 && (
        <div className="space-y-4">
          <PersonalFields value={personal} onChange={(v) => setPersonal({ ...personal, ...v })} errors={w.errors} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Documento de identificação" required={false} value={personal.idDocType} onChange={(v) => setPersonal({ ...personal, idDocType: v as typeof personal.idDocType })} options={[{ value: "RG", label: "RG" }, { value: "CNH", label: "CNH" }, { value: "OUTRO", label: "Outro" }]} hint="Informe quando necessário para o enquadramento." />
            <TextField label="Número do documento" required={false} value={personal.idDocNumber} onChange={(v) => setPersonal({ ...personal, idDocNumber: v })} maxLength={30} />
          </div>
        </div>
      )}
      {w.step === 1 && <AddressFields value={address} onChange={setAddress} errors={w.errors} />}
      {w.step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Nome fantasia pretendido" value={business.tradeName} onChange={(v) => setBusiness({ ...business, tradeName: v })} error={w.errors["business.tradeName"]} maxLength={120} />
            <TextField label="Capital inicial estimado (R$)" value={business.initialCapital} onChange={(v) => setBusiness({ ...business, initialCapital: v.replace(/[^\d,.]/g, "") })} error={w.errors["business.initialCapital"]} inputMode="decimal" placeholder="Ex.: 5.000,00" required={false} />
          </div>
          <TextField label="Atividade principal" value={business.mainActivity} onChange={(v) => setBusiness({ ...business, mainActivity: v })} error={w.errors["business.mainActivity"]} hint="Descreva o que você faz ou vende. Ex.: manicure, venda de roupas, conserto de celulares." maxLength={200} />
          <TextArea label="Atividades secundárias" required={false} value={business.secondaryActivities} onChange={(v) => setBusiness({ ...business, secondaryActivities: v })} rows={2} maxLength={600} />
          <RadioCards legend="Tipo de negócio" value={business.businessType} onChange={(v) => setBusiness({ ...business, businessType: v })} error={w.errors["business.businessType"]}
            options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value: value as "MEI", label }))} />
          <fieldset>
            <legend className="label">Forma de atuação <span className="text-red-600">*</span></legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {OPERATION_MODES.map((m) => <Checkbox key={m} checked={business.operationModes.includes(m)} onChange={() => toggleMode(m)}>{m}</Checkbox>)}
            </div>
            {w.errors["business.operationModes"] && <p className="field-error">{w.errors["business.operationModes"]}</p>}
          </fieldset>
          <Checkbox checked={business.sameAddress} onChange={(v) => setBusiness({ ...business, sameAddress: v })}>O endereço empresarial é o mesmo do endereço residencial.</Checkbox>
          {!business.sameAddress && <TextArea label="Endereço empresarial" value={business.businessAddress} onChange={(v) => setBusiness({ ...business, businessAddress: v })} error={w.errors["business.businessAddress"]} rows={2} maxLength={300} />}
        </div>
      )}
      {w.step === 3 && (
        <div className="space-y-5">
          <ReviewSection title="Dados pessoais" onEdit={() => w.go(0)} rows={[["Nome", personal.fullName], ["CPF", personal.cpf], ["Nascimento", personal.birthDate.split("-").reverse().join("/")], ["Telefone", personal.phone], ["E-mail", personal.email], ["Documento", personal.idDocType ? `${personal.idDocType} ${personal.idDocNumber}` : ""]]} />
          <ReviewSection title="Endereço" onEdit={() => w.go(1)} rows={[["CEP", address.cep], ["Endereço", `${address.street}, ${address.number} ${address.complement}`], ["Bairro", address.district], ["Cidade/UF", `${address.city}/${address.state}`]]} />
          <ReviewSection title="Dados empresariais" onEdit={() => w.go(2)} rows={[["Nome fantasia", business.tradeName], ["Atividade principal", business.mainActivity], ["Atividades secundárias", business.secondaryActivities], ["Tipo", TYPE_LABEL[business.businessType] ?? ""], ["Forma de atuação", business.operationModes.join(", ")], ["Endereço empresarial", business.sameAddress ? "Mesmo do residencial" : business.businessAddress], ["Capital inicial", business.initialCapital ? `R$ ${business.initialCapital}` : ""]]} />
          <div className="space-y-2">
            <BaseConsentFields value={consents} onChange={setConsents} errors={w.errors} />
            <Checkbox required checked={consents.privateFee} onChange={(v) => setConsents({ ...consents, privateFee: v })} error={w.errors["consents.privateFee"]}>
              Compreendo que a abertura de MEI pelos canais oficiais é gratuita e que o valor cobrado refere-se ao serviço privado de assistência e formalização, não a uma taxa governamental.
            </Checkbox>
          </div>
        </div>
      )}
      {w.step === 4 && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 text-center">
            <p className="text-sm text-muted">Serviço privado de assistência e formalização</p>
            <p className="mt-1 text-4xl font-extrabold text-brand-800">{formatMoney(priceCents)}</p>
            <p className="mt-2 text-sm text-muted">Pagamento único via Pix. Não é taxa governamental. O QR Code aparece ao confirmar.</p>
          </div>
          <Notice tone="info" title="A abertura de MEI pelos canais oficiais é gratuita.">
            Você pode se formalizar sem custo diretamente no portal oficial do governo. O valor acima remunera o serviço privado de assistência e condução da abertura. Ao confirmar, você recebe o QR Code e o Pix copia e cola para pagamento.
          </Notice>
        </div>
      )}
      <WizardNav step={w.step} total={STEPS.length} onBack={w.back} onNext={next} submitting={w.submitting} submitLabel="Confirmar contratação" />
    </div>
  );
}
