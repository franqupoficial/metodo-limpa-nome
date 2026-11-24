"use client";

import type { PixData } from "@/components/PixPayment";
import { useState } from "react";
import { lvbSchema, personalSchema, addressSchema, CNH_CATEGORIES, EXPERIENCE, EXPERIENCE_LABEL, PAYMENT_DAYS, RECURRING_LABEL, RECURRING_METHODS } from "@/lib/schemas";
import { simulate } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { Checkbox, FormAlert, RadioCards, ReviewSection, SelectField, Stepper, TextArea, TextField, WizardNav } from "@/components/forms/kit";
import { AddressFields, BaseConsentFields, Confirmation, PersonalFields, emptyAddress, emptyConsents, emptyPersonal, submitRequest } from "@/components/forms/shared";
import { maskDigits } from "@/components/forms/masks";
import { useWizard, validateWith } from "@/components/forms/useWizard";
import { Notice } from "@/components/ui";
import type { ClientPlanSettings, ClientVehicle } from "./types";
import { VehicleImage } from "./VehicleImage";

const STEPS = ["Dados pessoais", "Endereço", "Documentação", "Perfil de motorista", "Veículo e plano", "Revisão", "Pagamento"];

export function LvbForm({ vehicles, settings, initial }: { vehicles: ClientVehicle[]; settings: ClientPlanSettings; initial: { vehicleId?: string; term?: number; km?: string } }) {
  const w = useWizard(STEPS.length);
  const [personal, setPersonal] = useState(emptyPersonal);
  const [address, setAddress] = useState(emptyAddress);
  const [license, setLicense] = useState({ cnhNumber: "", cnhCategory: "", cnhExpiry: "", ear: "" as "" | "SIM" | "NAO", notes: "" });
  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const [driver, setDriver] = useState({ uber: false, app99: false, others: false, othersText: "", experience: "" as "" | (typeof EXPERIENCE)[number], mainPlatform: "", notes: "" });
  const [plan, setPlan] = useState({ vehicleId: initial.vehicleId ?? "", termMonths: String(initial.term ?? ""), kmPackage: initial.km ?? settings.kmPackages[0]?.id ?? "", paymentDay: "", recurringMethod: "" as "" | (typeof RECURRING_METHODS)[number] });
  const [consents, setConsents] = useState({ ...emptyConsents, analysis: false, conditions: false, recurring: false });
  const [done, setDone] = useState<{ protocol: string; accessCode: string; pix: PixData | null } | null>(null);

  const vehicle = vehicles.find((v) => v.id === plan.vehicleId);
  const kmPkg = settings.kmPackages.find((k) => k.id === plan.kmPackage) ?? null;
  const sim = vehicle && plan.termMonths ? simulate({ baseMonthlyCents: vehicle.monthlyCents, termMonths: Number(plan.termMonths), termAdjustments: settings.termAdjustments, kmPackage: kmPkg }) : null;

  if (done)
    return (
      <Confirmation {...done} title="Pedido de locação recebido." pixTitle="Pague a 1ª parcela via Pix">
        <p>Próximos passos: confirmação do pagamento da 1ª parcela, aprovação cadastral, envio do contrato e agendamento da retirada. As demais parcelas chegam ao seu e-mail antes de cada vencimento.</p>
      </Confirmation>
    );

  const planPayload = () => ({ ...plan, termMonths: Number(plan.termMonths), paymentDay: Number(plan.paymentDay) });
  const shape = lvbSchema.shape;

  async function next() {
    if (w.step === 0) return w.advance(validateWith(personalSchema, personal, "personal"));
    if (w.step === 1) return w.advance(validateWith(addressSchema, address, "address"));
    if (w.step === 2) {
      const errs = validateWith(shape.license, license, "license");
      if (cnhFile && cnhFile.size > 4 * 1024 * 1024) errs["license.file"] = "Arquivo maior que 4 MB.";
      return w.advance(errs);
    }
    if (w.step === 3) return w.advance(validateWith(shape.driver, driver, "driver"));
    if (w.step === 4) {
      const errs = validateWith(shape.plan, planPayload(), "plan");
      if (vehicle && !vehicle.terms.includes(Number(plan.termMonths))) errs["plan.termMonths"] = "Prazo indisponível para este veículo.";
      return w.advance(errs);
    }
    if (w.step === 5) return w.advance(validateWith(shape.consents.omit({ recurring: true }), consents, "consents"));
    const payload = { personal, address, license, driver, plan: planPayload(), consents };
    if (!w.advance(validateWith(lvbSchema, payload, ""))) return;
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    if (cnhFile) fd.set("cnh", cnhFile);
    w.setSubmitting(true);
    const r = await submitRequest("lvb", fd);
    w.setSubmitting(false);
    if (r.ok) setDone({ protocol: r.protocol, accessCode: r.accessCode, pix: r.pix });
    else { w.setFormError(r.error); if (r.fieldErrors) w.setErrors(r.fieldErrors); }
  }

  const yesNo = (b: boolean) => (b ? "Sim" : "Não");

  return (
    <div>
      <Stepper steps={STEPS} current={w.step} />
      {w.formError && <FormAlert message={w.formError} />}
      {w.step === 0 && <PersonalFields value={personal} onChange={setPersonal} errors={w.errors} />}
      {w.step === 1 && <AddressFields value={address} onChange={setAddress} errors={w.errors} />}
      {w.step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Número da CNH (registro)" value={license.cnhNumber} onChange={(v) => setLicense({ ...license, cnhNumber: v })} mask={maskDigits(11)} inputMode="numeric" error={w.errors["license.cnhNumber"]} />
            <SelectField label="Categoria" value={license.cnhCategory} onChange={(v) => setLicense({ ...license, cnhCategory: v })} options={CNH_CATEGORIES.map((c) => ({ value: c, label: c }))} error={w.errors["license.cnhCategory"]} />
            <TextField label="Data de validade" type="date" value={license.cnhExpiry} onChange={(v) => setLicense({ ...license, cnhExpiry: v })} error={w.errors["license.cnhExpiry"]} />
          </div>
          <RadioCards legend="Sua CNH possui a observação EAR (Exerce Atividade Remunerada)?" value={license.ear} onChange={(v) => setLicense({ ...license, ear: v })} error={w.errors["license.ear"]}
            options={[{ value: "SIM", label: "Sim", description: "Exigida pela maioria das plataformas de transporte." }, { value: "NAO", label: "Não", description: "Pode ser exigida conforme o plano e a plataforma." }]} />
          <TextArea label="Informações de habilitação" required={false} hint="Ex.: tempo de habilitação, pontuação, restrições." value={license.notes} onChange={(v) => setLicense({ ...license, notes: v })} rows={2} maxLength={500} />
          <div>
            <label htmlFor="cnh-file" className="label">Cópia da CNH <span className="text-xs font-normal text-muted">(opcional)</span></label>
            <input id="cnh-file" type="file" accept="image/jpeg,image/png,application/pdf" className="input file:mr-3 file:rounded-full file:border-0 file:bg-lvb-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-lvb-700" onChange={(e) => setCnhFile(e.target.files?.[0] ?? null)} />
            <p className="hint">JPG, PNG ou PDF, até 4 MB. O arquivo é armazenado de forma criptografada, com acesso restrito. Se a operação precisar de outro documento, pediremos pelo e-mail cadastrado.</p>
            {w.errors["license.file"] && <p className="field-error">{w.errors["license.file"]}</p>}
          </div>
        </div>
      )}
      {w.step === 3 && (
        <div className="space-y-4">
          <fieldset>
            <legend className="label">Em quais plataformas você trabalha?</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              <Checkbox checked={driver.uber} onChange={(v) => setDriver({ ...driver, uber: v })}>Trabalho com Uber</Checkbox>
              <Checkbox checked={driver.app99} onChange={(v) => setDriver({ ...driver, app99: v })}>Trabalho com 99</Checkbox>
              <Checkbox checked={driver.others} onChange={(v) => setDriver({ ...driver, others: v })}>Outros aplicativos</Checkbox>
            </div>
          </fieldset>
          {driver.others && <TextField label="Quais outros aplicativos?" required={false} value={driver.othersText} onChange={(v) => setDriver({ ...driver, othersText: v })} maxLength={120} />}
          <SelectField label="Há quanto tempo trabalha como motorista?" value={driver.experience} onChange={(v) => setDriver({ ...driver, experience: v as typeof driver.experience })} options={EXPERIENCE.map((e) => ({ value: e, label: EXPERIENCE_LABEL[e] }))} error={w.errors["driver.experience"]} />
          <TextField label="Plataforma principal" required={false} value={driver.mainPlatform} onChange={(v) => setDriver({ ...driver, mainPlatform: v })} maxLength={60} />
          <TextArea label="Informações adicionais" required={false} hint="Ex.: cidade em que atua, média de horas por semana, se já alugou veículos." value={driver.notes} onChange={(v) => setDriver({ ...driver, notes: v })} rows={3} maxLength={800} />
        </div>
      )}
      {w.step === 4 && (
        <div className="space-y-5">
          <SelectField label="Veículo" value={plan.vehicleId} onChange={(v) => setPlan({ ...plan, vehicleId: v })} error={w.errors["plan.vehicleId"]}
            options={vehicles.map((v) => ({ value: v.id, label: `${v.categoryName} — ${v.brand} ${v.name} (${formatMoney(v.monthlyCents)}/mês)` }))} />
          {vehicle && (
            <div className="flex flex-col gap-4 rounded-xl border border-line p-4 sm:flex-row">
              <VehicleImage url={vehicle.imageUrl} category={vehicle.categoryName} caption={vehicle.imageCaption} className="aspect-[16/9] w-full shrink-0 rounded-lg sm:w-56" />
              <div className="text-sm">
                <p className="font-bold">{vehicle.brand} {vehicle.name}</p>
                <p className="text-muted">Categoria {vehicle.categoryName} · {vehicle.kmPerMonth.toLocaleString("pt-BR")} km/mês</p>
                <ul className="mt-2 flex flex-wrap gap-1">{vehicle.features.slice(0, 5).map((f) => <li key={f} className="badge bg-surface text-ink">{f}</li>)}</ul>
              </div>
            </div>
          )}
          <RadioCards legend="Prazo" value={plan.termMonths} onChange={(v) => setPlan({ ...plan, termMonths: v })} error={w.errors["plan.termMonths"]} columns={3}
            options={(vehicle?.terms ?? [12, 24, 36]).map((t) => ({ value: String(t), label: `${t} meses` }))} />
          {settings.kmPackages.length > 0 && (
            <SelectField label="Pacote de quilometragem" value={plan.kmPackage} onChange={(v) => setPlan({ ...plan, kmPackage: v })} options={settings.kmPackages.map((k) => ({ value: k.id, label: k.label }))} />
          )}
          <RadioCards legend="Data de pagamento desejada (dia do mês)" value={plan.paymentDay} onChange={(v) => setPlan({ ...plan, paymentDay: v })} error={w.errors["plan.paymentDay"]} columns={3}
            options={PAYMENT_DAYS.map((d) => ({ value: String(d), label: `Dia ${d}` }))} />
          <RadioCards legend="Como deseja receber as cobranças das demais parcelas?" value={plan.recurringMethod} onChange={(v) => setPlan({ ...plan, recurringMethod: v })} error={w.errors["plan.recurringMethod"]}
            options={RECURRING_METHODS.map((m) => ({ value: m, label: RECURRING_LABEL[m], description: "Enviado ao seu e-mail antes do dia de vencimento escolhido." }))} />
          {sim && (
            <div className="rounded-xl border border-lvb-100 bg-lvb-50 p-4 text-sm">
              <p className="font-semibold text-lvb-900">Informações do plano</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                <li>Valor mensal: <strong>{formatMoney(sim.monthlyCents)}</strong></li>
                <li>Primeira parcela: <strong>{formatMoney(sim.firstInstallmentCents)}</strong> (via Pix ao concluir)</li>
                <li>Demais: <strong>{sim.remainingInstallments}× {formatMoney(sim.monthlyCents)}</strong> (recorrente)</li>
                <li>Total estimado: <strong>{formatMoney(sim.totalCents)}</strong></li>
              </ul>
            </div>
          )}
        </div>
      )}
      {w.step === 5 && (
        <div className="space-y-5">
          <ReviewSection title="Dados pessoais" onEdit={() => w.go(0)} rows={[["Nome", personal.fullName], ["CPF", personal.cpf], ["Nascimento", personal.birthDate.split("-").reverse().join("/")], ["Telefone", personal.phone], ["E-mail", personal.email]]} />
          <ReviewSection title="Endereço" onEdit={() => w.go(1)} rows={[["CEP", address.cep], ["Endereço", `${address.street}, ${address.number} ${address.complement}`], ["Bairro", address.district], ["Cidade/UF", `${address.city}/${address.state}`]]} />
          <ReviewSection title="Documentação" onEdit={() => w.go(2)} rows={[["CNH", license.cnhNumber], ["Categoria", license.cnhCategory], ["Validade", license.cnhExpiry.split("-").reverse().join("/")], ["EAR", license.ear === "SIM" ? "Sim" : "Não"], ["Arquivo", cnhFile?.name ?? "Não enviado"]]} />
          <ReviewSection title="Perfil de motorista" onEdit={() => w.go(3)} rows={[["Uber", yesNo(driver.uber)], ["99", yesNo(driver.app99)], ["Outros", driver.others ? driver.othersText || "Sim" : "Não"], ["Experiência", driver.experience ? EXPERIENCE_LABEL[driver.experience] : ""], ["Plataforma principal", driver.mainPlatform]]} />
          <ReviewSection title="Veículo e plano" onEdit={() => w.go(4)} rows={[["Veículo", vehicle ? `${vehicle.brand} ${vehicle.name}` : ""], ["Categoria", vehicle?.categoryName ?? ""], ["Prazo", `${plan.termMonths} meses`], ["Valor mensal", formatMoney(sim?.monthlyCents)], ["Total estimado", formatMoney(sim?.totalCents)], ["Quilometragem", kmPkg?.label ?? (vehicle ? `${vehicle.kmPerMonth.toLocaleString("pt-BR")} km/mês` : "")], ["Vencimento", plan.paymentDay ? `Todo dia ${plan.paymentDay}` : ""], ["Demais parcelas", plan.recurringMethod ? RECURRING_LABEL[plan.recurringMethod] : ""]]} />
          <Notice tone="warn" title="Condições">
            {settings.priceNotice} A primeira parcela é paga no ato da contratação e as demais de forma recorrente, mediante autorização. Coberturas, manutenção, IPVA e assistência: {settings.inclusionNotes} {settings.costs.map((c) => c.label).join(", ")} podem ser aplicáveis e serão detalhados na proposta.
          </Notice>
          <div className="space-y-2">
            <BaseConsentFields value={consents} onChange={setConsents} errors={w.errors} />
            <Checkbox required checked={consents.analysis} onChange={(v) => setConsents({ ...consents, analysis: v })} error={w.errors["consents.analysis"]}>
              Autorizo a verificação cadastral e da minha habilitação para aprovação da locação.
            </Checkbox>
            <Checkbox required checked={consents.conditions} onChange={(v) => setConsents({ ...consents, conditions: v })} error={w.errors["consents.conditions"]}>
              Li as condições do plano e compreendo que a locação é formalizada por contrato, após aprovação cadastral e confirmação do veículo, com primeira parcela no ato da contratação e demais parcelas recorrentes no dia escolhido.
            </Checkbox>
          </div>
        </div>
      )}
      {w.step === 6 && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-emerald-900">Primeira parcela — paga via Pix ao concluir</p>
            <p className="text-3xl font-extrabold text-emerald-800">{formatMoney(sim?.monthlyCents)}</p>
            {sim && vehicle && <p className="mt-1 text-sm text-emerald-900">{vehicle.brand} {vehicle.name} · {sim.termMonths} meses · demais {sim.remainingInstallments} parcelas de {formatMoney(sim.monthlyCents)} todo dia {plan.paymentDay} ({plan.recurringMethod ? RECURRING_LABEL[plan.recurringMethod] : ""})</p>}
          </div>
          <Checkbox required checked={consents.recurring} onChange={(v) => setConsents({ ...consents, recurring: v })} error={w.errors["consents.recurring"]}>
            Aceito o pagamento recorrente: autorizo o envio das cobranças das demais {sim?.remainingInstallments ?? ""} parcelas de {formatMoney(sim?.monthlyCents)} ao meu e-mail, por {plan.recurringMethod === "BOLETO" ? "boleto" : "Pix"}, para pagamento até todo dia {plan.paymentDay}, conforme o contrato de locação.
          </Checkbox>
          <p className="text-sm text-muted">Ao concluir, você recebe o QR Code e o Pix copia e cola da primeira parcela. Com o pagamento confirmado e o cadastro aprovado, enviamos o contrato e agendamos a retirada do veículo.</p>
        </div>
      )}
      <WizardNav step={w.step} total={STEPS.length} onBack={w.back} onNext={next} submitting={w.submitting} submitLabel="Concluir e gerar Pix da 1ª parcela" />
    </div>
  );
}
