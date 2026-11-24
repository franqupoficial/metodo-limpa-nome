"use client";

import { useState } from "react";
import type { ZodTypeAny } from "zod";
import { zodErrorsToMap, type Errors } from "./kit";
import { scrollTop } from "./shared";

export function validateWith(schema: ZodTypeAny, value: unknown, prefix: string): Errors {
  const r = schema.safeParse(value);
  return r.success ? {} : zodErrorsToMap(r.error.issues, prefix);
}

export function useWizard(total: number) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function go(n: number) {
    setStep(n);
    setErrors({});
    setFormError("");
    scrollTop();
  }

  /** Valida e avança. Retorna false se houver erros. */
  function advance(stepErrors: Errors): boolean {
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length) {
      setFormError("Revise os campos destacados.");
      setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(), 50);
      return false;
    }
    setFormError("");
    if (step < total - 1) go(step + 1);
    return true;
  }

  return { step, errors, setErrors, formError, setFormError, submitting, setSubmitting, go, advance, back: () => go(Math.max(0, step - 1)) };
}
