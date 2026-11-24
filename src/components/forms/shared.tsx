"use client";

import { useState } from "react";
import { TextField, SelectField, Checkbox, type Errors } from "./kit";
import { maskCepInput, maskCpfInput, maskPhoneInput } from "./masks";
import { UFS } from "@/lib/validators";
import { Icon } from "@/components/Icon";
import Link from "next/link";
import { PixPayment, type PixData } from "@/components/PixPayment";

export interface PersonalState { fullName: string; cpf: string; birthDate: string; phone: string; email: string }
export interface AddressState { cep: string; street: string; number: string; complement: string; district: string; city: string; state: string }
export const emptyPersonal: PersonalState = { fullName: "", cpf: "", birthDate: "", phone: "", email: "" };
export const emptyAddress: AddressState = { cep: "", street: "", number: "", complement: "", district: "", city: "", state: "" };

export function PersonalFields({ value, onChange, errors, prefix = "personal" }: { value: PersonalState; onChange: (v: PersonalState) => void; errors: Errors; prefix?: string }) {
  const set = (k: keyof PersonalState) => (v: string) => onChange({ ...value, [k]: v });
  const e = (k: string) => errors[`${prefix}.${k}`];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField className="sm:col-span-2" label="Nome completo" value={value.fullName} onChange={set("fullName")} error={e("fullName")} autoComplete="name" maxLength={120} />
      <TextField label="CPF" value={value.cpf} onChange={set("cpf")} error={e("cpf")} mask={maskCpfInput} inputMode="numeric" placeholder="000.000.000-00" />
      <TextField label="Data de nascimento" type="date" value={value.birthDate} onChange={set("birthDate")} error={e("birthDate")} autoComplete="bday" />
      <TextField label="Telefone (celular)" value={value.phone} onChange={set("phone")} error={e("phone")} mask={maskPhoneInput} inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" />
      <TextField label="E-mail" type="email" value={value.email} onChange={set("email")} error={e("email")} autoComplete="email" maxLength={160} />
    </div>
  );
}

export function AddressFields({ value, onChange, errors, prefix = "address" }: { value: AddressState; onChange: (v: AddressState) => void; errors: Errors; prefix?: string }) {
  const [loading, setLoading] = useState(false);
  const [cepMsg, setCepMsg] = useState("");
  const set = (k: keyof AddressState) => (v: string) => onChange({ ...value, [k]: v });
  const e = (k: string) => errors[`${prefix}.${k}`];

  async function lookup(cepMasked: string) {
    const cep = cepMasked.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setLoading(true);
    setCepMsg("");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const j = await r.json();
      if (j.erro) setCepMsg("CEP não encontrado. Preencha o endereço manualmente.");
      else onChange({ ...value, cep: cepMasked, street: j.logradouro || value.street, district: j.bairro || value.district, city: j.localidade || value.city, state: j.uf || value.state });
    } catch {
      setCepMsg("Não foi possível consultar o CEP. Preencha manualmente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <TextField
        className="sm:col-span-2"
        label="CEP"
        value={value.cep}
        onChange={(v) => { set("cep")(v); if (v.replace(/\D/g, "").length === 8) lookup(v); }}
        error={e("cep")}
        hint={loading ? "Buscando endereço…" : cepMsg || "O endereço é preenchido automaticamente."}
        mask={maskCepInput}
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
      />
      <TextField className="sm:col-span-4" label="Rua / logradouro" value={value.street} onChange={set("street")} error={e("street")} autoComplete="address-line1" />
      <TextField className="sm:col-span-2" label="Número" value={value.number} onChange={set("number")} error={e("number")} maxLength={20} />
      <TextField className="sm:col-span-4" label="Complemento" required={false} value={value.complement} onChange={set("complement")} error={e("complement")} maxLength={80} />
      <TextField className="sm:col-span-2" label="Bairro" value={value.district} onChange={set("district")} error={e("district")} />
      <TextField className="sm:col-span-3" label="Cidade" value={value.city} onChange={set("city")} error={e("city")} autoComplete="address-level2" />
      <SelectField className="sm:col-span-1" label="UF" value={value.state} onChange={set("state")} error={e("state")} options={UFS.map((u) => ({ value: u, label: u }))} placeholder="—" />
    </div>
  );
}

export interface BaseConsents { privacy: boolean; terms: boolean; truthful: boolean; marketing: boolean }
export const emptyConsents: BaseConsents = { privacy: false, terms: false, truthful: false, marketing: false };

export function BaseConsentFields<T extends BaseConsents>({ value, onChange, errors }: { value: T; onChange: (v: T) => void; errors: Errors }) {
  const set = (k: keyof BaseConsents) => (v: boolean) => onChange({ ...value, [k]: v });
  return (
    <>
      <Checkbox required checked={value.privacy} onChange={set("privacy")} error={errors["consents.privacy"]}>
        Li e concordo com a <Link href="/privacidade" target="_blank" className="font-semibold">Política de Privacidade</Link> e autorizo o tratamento dos meus dados pessoais para a finalidade desta solicitação.
      </Checkbox>
      <Checkbox required checked={value.terms} onChange={set("terms")} error={errors["consents.terms"]}>
        Li e concordo com os <Link href="/termos" target="_blank" className="font-semibold">Termos de Uso</Link>.
      </Checkbox>
      <Checkbox required checked={value.truthful} onChange={set("truthful")} error={errors["consents.truthful"]}>
        Declaro que as informações fornecidas são verdadeiras e que sou o titular dos dados informados.
      </Checkbox>
      <Checkbox checked={value.marketing} onChange={set("marketing")}>
        Aceito receber comunicações informativas do Portal Consumidor. (opcional — você pode cancelar a qualquer momento)
      </Checkbox>
    </>
  );
}

export function Confirmation({ protocol, accessCode, title = "Sua solicitação foi recebida.", children, pix, pixTitle }: { protocol: string; accessCode: string; title?: string; children?: React.ReactNode; pix?: PixData | null; pixTitle?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="animate-fade-up text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" className="h-8 w-8" /></span>
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <div className="mx-auto mt-6 grid max-w-lg gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs text-muted">Número de protocolo</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-wide">{protocol}</p>
        </div>
        <div className="rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 p-4">
          <p className="text-xs text-muted">Código de acesso</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-widest">{accessCode}</p>
        </div>
      </div>
      <button
        type="button"
        className="btn-ghost btn-sm mt-3"
        onClick={() => { navigator.clipboard?.writeText(`Protocolo: ${protocol}\nCódigo de acesso: ${accessCode}`); setCopied(true); }}
      >
        {copied ? "Copiado!" : "Copiar protocolo e código"}
      </button>
      {pix && <div className="mx-auto mt-6 max-w-2xl"><PixPayment pix={pix} title={pixTitle} /></div>}
      <div className="mx-auto mt-4 max-w-lg text-left">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Guarde o código de acesso.</p>
          <p className="mt-1">Por segurança, ele é exibido apenas agora e não é enviado por e-mail. Você precisará do protocolo e do código para acompanhar a solicitação.</p>
        </div>
        {children && <div className="mt-4 text-sm leading-relaxed text-muted">{children}</div>}
      </div>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href={`/acompanhar?protocolo=${encodeURIComponent(protocol)}`} className="btn-primary">Acompanhar solicitação</Link>
        <Link href="/" className="btn-secondary">Voltar ao início</Link>
      </div>
    </div>
  );
}

export async function submitRequest(service: string, body: unknown | FormData): Promise<{ ok: true; protocol: string; accessCode: string; pix: PixData | null } | { ok: false; error: string; fieldErrors?: Errors }> {
  try {
    const isForm = body instanceof FormData;
    const res = await fetch(`/api/solicitacoes/${service}`, {
      method: "POST",
      headers: isForm ? undefined : { "Content-Type": "application/json" },
      body: isForm ? body : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, protocol: json.protocol, accessCode: json.accessCode, pix: json.pix ?? null };
    return { ok: false, error: json.error ?? "Não foi possível enviar sua solicitação.", fieldErrors: json.fieldErrors };
  } catch {
    return { ok: false, error: "Falha de conexão. Verifique sua internet e tente novamente." };
  }
}

export function scrollTop() {
  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
}
