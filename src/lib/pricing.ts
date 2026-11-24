/**
 * Regras de preço da LVB.
 *
 * Modo REFERENCE: preço sugerido = valor de referência × (1 − desconto). Com o desconto padrão de 20%,
 * o fator é 0,80. O resultado é apenas uma SUGESTÃO: só é publicado após validação administrativa.
 * Modo MANUAL: o administrador define o preço final diretamente.
 */

export const DEFAULT_DISCOUNT_PERCENT = 20;
/** Referências mais antigas que isso são sinalizadas como possivelmente desatualizadas. */
export const REFERENCE_MAX_AGE_DAYS = 60;

export function positionedPrice(referenceCents: number, discountPercent = DEFAULT_DISCOUNT_PERCENT): number {
  if (!Number.isFinite(referenceCents) || referenceCents <= 0) throw new Error("Valor de referência inválido.");
  if (discountPercent < 0 || discountPercent >= 100) throw new Error("Desconto deve estar entre 0% e 99%.");
  // arredonda para o múltiplo de R$ 1,00 mais próximo
  return Math.round((referenceCents * (1 - discountPercent / 100)) / 100) * 100;
}

export function referenceIsStale(referenceDate: Date | null | undefined, now = new Date()): boolean {
  if (!referenceDate) return true;
  return now.getTime() - referenceDate.getTime() > REFERENCE_MAX_AGE_DAYS * 86_400_000;
}

export interface TermAdjustments {
  [months: string]: number; // percentual (+/-) sobre o valor mensal base
}

export interface KmPackage {
  id: string;
  label: string;
  surchargePercent: number;
}

export interface SimulationInput {
  baseMonthlyCents: number;
  termMonths: number;
  termAdjustments: TermAdjustments;
  kmPackage?: KmPackage | null;
}

export interface Simulation {
  monthlyCents: number;
  firstInstallmentCents: number;
  remainingInstallments: number;
  totalCents: number;
  termMonths: number;
}

export function simulate({ baseMonthlyCents, termMonths, termAdjustments, kmPackage }: SimulationInput): Simulation {
  if (![12, 24, 36].includes(termMonths)) throw new Error("Prazo inválido.");
  const termAdj = Number(termAdjustments[String(termMonths)] ?? 0);
  const kmAdj = kmPackage ? kmPackage.surchargePercent : 0;
  const monthly = Math.round((baseMonthlyCents * (1 + termAdj / 100) * (1 + kmAdj / 100)) / 100) * 100;
  return {
    monthlyCents: monthly,
    firstInstallmentCents: monthly,
    remainingInstallments: termMonths - 1,
    totalCents: monthly * termMonths,
    termMonths,
  };
}
