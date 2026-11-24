import "server-only";
import type { PaymentProvider } from "./types";

/**
 * Ponto único de integração. Para habilitar o checkout no futuro:
 *  1. Implemente PaymentProvider para o fornecedor escolhido (ex.: src/lib/payments/providers/<fornecedor>.ts).
 *  2. Configure PAYMENT_PROVIDER e as credenciais em variáveis de ambiente.
 *  3. Registre o provider no mapa abaixo.
 */
const providers: Record<string, () => PaymentProvider> = {};

export function getPaymentProvider(): PaymentProvider | null {
  const name = process.env.PAYMENT_PROVIDER;
  if (!name || !providers[name]) return null;
  return providers[name]();
}

export const checkoutEnabled = () => getPaymentProvider() !== null;

/** Campos que nunca podem aparecer em payloads persistidos ou logs. */
const FORBIDDEN_KEYS = /^(card_?number|number|pan|cvv|cvc|security_?code|cardholder_?data)$/i;

export function scrubPaymentPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubPaymentPayload);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, FORBIDDEN_KEYS.test(k) ? "[removido]" : scrubPaymentPayload(v)]),
    );
  }
  if (typeof value === "string" && /\b\d{13,19}\b/.test(value)) return value.replace(/\b\d{13,19}\b/g, "[removido]");
  return value;
}
