"use client";

import React, { useId } from "react";
import { Icon } from "@/components/Icon";

export type Errors = Record<string, string>;

export function zodErrorsToMap(issues: { path: (string | number)[]; message: string }[], prefix = ""): Errors {
  const out: Errors = {};
  for (const i of issues) {
    const key = (prefix ? [prefix, ...i.path] : i.path).join(".");
    if (!out[key]) out[key] = i.message;
  }
  return out;
}

export function Field({
  label, error, hint, required, children, id, className = "",
}: { label: string; error?: string; hint?: string; required?: boolean; children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode; id?: string; className?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  const describedBy = [error ? `${fid}-err` : "", hint ? `${fid}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={fid} className="label">
        {label} {required ? <span className="text-red-600" aria-hidden>*</span> : <span className="text-xs font-normal text-muted">(opcional)</span>}
      </label>
      {children({ id: fid, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {hint && !error && <p id={`${fid}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${fid}-err`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function TextField({
  label, value, onChange, error, hint, required = true, type = "text", mask, placeholder, autoComplete, inputMode, className, maxLength, min, max, onBlur, step,
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; required?: boolean; type?: string;
  mask?: (v: string) => string; placeholder?: string; autoComplete?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string; maxLength?: number; min?: string | number; max?: string | number; onBlur?: () => void; step?: string;
}) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(p) => (
        <input
          {...p}
          type={type}
          className="input"
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          required={required}
          onBlur={onBlur}
          onChange={(e) => onChange(mask ? mask(e.target.value) : e.target.value)}
        />
      )}
    </Field>
  );
}

export function TextArea({ label, value, onChange, error, hint, required = true, rows = 4, maxLength }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; required?: boolean; rows?: number; maxLength?: number }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(p) => <textarea {...p} className="input" rows={rows} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export function SelectField({ label, value, onChange, options, error, hint, required = true, placeholder = "Selecione", className }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; error?: string; hint?: string; required?: boolean; placeholder?: string; className?: string }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(p) => (
        <select {...p} className="input" value={value} onChange={(e) => onChange(e.target.value)} required={required}>
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  );
}

export function Checkbox({ checked, onChange, children, error, required }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; error?: string; required?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm leading-relaxed transition-colors ${checked ? "border-brand-300 bg-brand-50/60" : "border-line hover:bg-surface"} ${error ? "border-red-400" : ""}`}>
        <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} />
        <span>{children}{required && <span className="text-red-600" aria-hidden> *</span>}</span>
      </label>
      {error && <p id={`${id}-err`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function RadioCards<T extends string>({ legend, value, onChange, options, error, columns = 2 }: { legend: string; value: T | ""; onChange: (v: T) => void; options: { value: T; label: string; description?: string }[]; error?: string; columns?: 2 | 3 }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="label">{legend} <span className="text-red-600" aria-hidden>*</span></legend>
      <div className={`grid gap-2 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {options.map((o) => (
          <label key={o.value} className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors ${value === o.value ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-line hover:bg-surface"}`}>
            <input type="radio" name={name} className="mt-0.5 accent-brand-700" checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>
              <span className="block font-semibold">{o.label}</span>
              {o.description && <span className="mt-0.5 block text-xs text-muted">{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </fieldset>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const pct = Math.round(((current + 1) / steps.length) * 100);
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold text-brand-800">Etapa {current + 1} de {steps.length}: {steps[current]}</p>
        <p className="text-muted">{pct}%</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progresso do formulário">
        <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-4 hidden gap-2 md:flex">
        {steps.map((s, i) => (
          <li key={s} className={`flex flex-1 items-center gap-2 text-xs ${i <= current ? "font-semibold text-brand-800" : "text-muted"}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${i < current ? "bg-brand-600 text-white" : i === current ? "bg-brand-100 text-brand-800 ring-2 ring-brand-600" : "bg-surface text-muted"}`}>
              {i < current ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="truncate">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function WizardNav({ step, total, onBack, onNext, submitting, nextLabel, submitLabel = "Enviar solicitação" }: { step: number; total: number; onBack: () => void; onNext: () => void; submitting?: boolean; nextLabel?: string; submitLabel?: string }) {
  const last = step === total - 1;
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
      <button type="button" className="btn-secondary" onClick={onBack} disabled={step === 0 || submitting}>Voltar</button>
      <button type="button" className="btn-primary" onClick={onNext} disabled={submitting}>
        {submitting ? "Enviando…" : last ? submitLabel : nextLabel ?? "Continuar"}
        {!submitting && <Icon name="arrow" className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function ReviewSection({ title, rows, onEdit }: { title: string; rows: [string, React.ReactNode][]; onEdit?: () => void }) {
  return (
    <section className="rounded-xl border border-line">
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <h3 className="text-sm font-bold">{title}</h3>
        {onEdit && <button type="button" onClick={onEdit} className="text-xs font-semibold text-brand-700 hover:underline">Editar</button>}
      </div>
      <dl className="grid gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="font-medium break-words">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function FormAlert({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-4 flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
      <Icon name="alert" className="h-5 w-5 shrink-0" /> {message}
    </div>
  );
}
