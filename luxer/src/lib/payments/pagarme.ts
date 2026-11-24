import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Integração Pagar.me — API Core v5 (https://docs.pagar.me/reference).
 * Credenciais SOMENTE por variáveis de ambiente:
 *   PAGARME_SECRET_KEY       sk_test_… (homologação) ou sk_… (produção)
 *   NEXT_PUBLIC_PAGARME_PUBLIC_KEY  pk_test_… / pk_… (tokenização do cartão no navegador)
 *   PAGARME_WEBHOOK_USER / PAGARME_WEBHOOK_PASSWORD  (Basic Auth configurada no webhook do painel Pagar.me)
 * Os dados do cartão nunca passam pelo nosso servidor: o navegador envia o cartão direto à Pagar.me
 * e recebemos apenas o card_token.
 */
// PAGARME_API_URL só deve ser definido em testes automatizados (servidor simulado local)
const BASE = process.env.PAGARME_API_URL || "https://api.pagar.me/core/v5";

export const pagarmeConfigured = () => Boolean(process.env.PAGARME_SECRET_KEY);
export const pagarmeSandbox = () => (process.env.PAGARME_SECRET_KEY || "").startsWith("sk_test_");

export class PagarmeError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.PAGARME_SECRET_KEY;
  if (!key) throw new PagarmeError("Pagar.me não configurada (PAGARME_SECRET_KEY ausente).", 0);
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: "Basic " + Buffer.from(`${key}:`).toString("base64"),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data as { message?: string })?.message || `Pagar.me respondeu ${res.status}`;
    throw new PagarmeError(msg, res.status, data);
  }
  return data as T;
}

export type PgTransaction = {
  id: string;
  status: string;
  qr_code?: string;
  qr_code_url?: string;
  expires_at?: string;
  installments?: number;
  card?: { brand?: string; last_four_digits?: string };
  acquirer_message?: string;
  gateway_response?: { code?: string; errors?: { message: string }[] };
  antifraud_response?: { status?: string };
};
export type PgCharge = { id: string; code?: string; status: string; amount: number; paid_amount?: number; canceled_amount?: number; payment_method: string; paid_at?: string; last_transaction?: PgTransaction };
export type PgOrder = { id: string; code: string; status: string; amount: number; charges?: PgCharge[]; metadata?: Record<string, string> };

export type PgAddress = { line_1: string; line_2?: string; zip_code: string; city: string; state: string; country: "BR" };

export type CreateOrderInput = {
  code: string;
  customer: { name: string; email: string; cpf: string; phone?: string | null; address?: PgAddress };
  /** linhas já com descontos rateados (amount = valor da linha em centavos, quantity = 1) */
  items: { code: string; description: string; amount: number }[];
  shipping?: { amount: number; description: string; recipient_name: string; address: PgAddress };
  payment:
    | { method: "pix"; expiresInSeconds: number; additionalInfo?: { name: string; value: string }[] }
    | { method: "credit_card"; cardToken: string; installments: number; statementDescriptor: string; billingAddress: PgAddress };
  metadata?: Record<string, string>;
  ip?: string;
};

function phoneObj(phone?: string | null) {
  const d = (phone || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length < 10) return undefined;
  return { mobile_phone: { country_code: "55", area_code: d.slice(0, 2), number: d.slice(2) } };
}

export async function createOrder(input: CreateOrderInput): Promise<PgOrder> {
  const payment =
    input.payment.method === "pix"
      ? { payment_method: "pix", pix: { expires_in: input.payment.expiresInSeconds, additional_information: input.payment.additionalInfo } }
      : {
          payment_method: "credit_card",
          credit_card: {
            installments: input.payment.installments,
            statement_descriptor: input.payment.statementDescriptor.slice(0, 13),
            operation_type: "auth_and_capture",
            card_token: input.payment.cardToken,
            card: { billing_address: input.payment.billingAddress },
          },
        };
  return call<PgOrder>("POST", "/orders", {
    code: input.code,
    closed: true,
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      type: "individual",
      document: input.customer.cpf.replace(/\D/g, ""),
      document_type: "CPF",
      phones: phoneObj(input.customer.phone),
      address: input.customer.address,
    },
    items: input.items.map((i) => ({ code: i.code, description: i.description.slice(0, 256), amount: i.amount, quantity: 1 })),
    shipping: input.shipping,
    payments: [payment],
    metadata: input.metadata,
    ip: input.ip,
  });
}

export const getOrder = (id: string) => call<PgOrder>("GET", `/orders/${encodeURIComponent(id)}`);
export const getCharge = (id: string) => call<PgCharge>("GET", `/charges/${encodeURIComponent(id)}`);
export const cancelCharge = (id: string, amount?: number) => call<PgCharge>("DELETE", `/charges/${encodeURIComponent(id)}`, amount ? { amount } : undefined);

export type PgPayable = { id: number | string; status: string; amount: number; fee: number; anticipation_fee?: number; fraud_coverage_fee?: number; installment?: number; payment_date?: string; type?: string };
/** Recebíveis de uma cobrança (taxas e datas de pagamento informadas pelo gateway). */
export async function getPayables(chargeId: string): Promise<PgPayable[]> {
  const r = await call<{ data?: PgPayable[] }>("GET", `/payables?charge_id=${encodeURIComponent(chargeId)}&size=50`);
  return r.data ?? [];
}

/** Mapeia o status da cobrança na Pagar.me para o status interno de pagamento. */
export function mapChargeStatus(s: string): "PENDING" | "PAID" | "FAILED" | "CANCELED" | "REFUNDED" | "AUTHORIZED" {
  switch (s) {
    case "paid":
    case "overpaid":
      return "PAID";
    case "authorized_pending_capture":
      return "AUTHORIZED";
    case "failed":
    case "not_authorized":
    case "with_error":
      return "FAILED";
    case "canceled":
    case "voided":
      return "CANCELED";
    case "refunded":
      return "REFUNDED";
    default:
      return "PENDING";
  }
}

export function failureMessage(c?: PgCharge): string | null {
  const t = c?.last_transaction;
  if (!t) return null;
  if (t.antifraud_response?.status === "reproved") return "Pagamento recusado pela análise antifraude.";
  return t.acquirer_message || t.gateway_response?.errors?.map((e) => e.message).join("; ") || null;
}

/** Webhook: Basic Auth configurada no painel da Pagar.me. */
export function verifyWebhookAuth(header: string | null): boolean {
  const user = process.env.PAGARME_WEBHOOK_USER;
  const pass = process.env.PAGARME_WEBHOOK_PASSWORD;
  if (!user || !pass) return false;
  if (!header?.startsWith("Basic ")) return false;
  const expected = Buffer.from(`${user}:${pass}`);
  const got = Buffer.from(header.slice(6), "base64");
  return got.length === expected.length && timingSafeEqual(got, expected);
}
