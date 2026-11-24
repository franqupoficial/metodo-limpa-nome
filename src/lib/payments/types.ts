/**
 * Arquitetura preparada para checkout futuro (NÃO implementado nesta etapa).
 *
 * Princípios:
 *  - Dados de cartão são capturados exclusivamente pelo componente seguro do fornecedor (tokenização no navegador).
 *  - O sistema recebe e armazena apenas: token/ID da cobrança, ID de autorização, bandeira e 4 últimos dígitos.
 *  - NUNCA trafegar, registrar em log ou armazenar número completo de cartão ou CVV.
 *  - Atualizações de status chegam por webhook assinado do fornecedor (/api/pagamentos/webhook).
 */
import type { PaymentMethod, PaymentStatus } from "@prisma/client";

export interface CreateChargeInput {
  requestId: string;
  protocol: string;
  amountCents: number;
  method: PaymentMethod;
  installments?: number;
  dueDate?: Date;
  customer: { name: string; email: string; taxIdHash: string };
  /** token gerado pelo SDK do fornecedor no navegador (cartão) */
  cardToken?: string;
}

export interface ChargeResult {
  providerChargeId: string;
  status: PaymentStatus;
  pixQrCode?: string;
  pixCopyPaste?: string;
  expiresAt?: Date;
  cardBrand?: string;
  cardLast4?: string;
}

export interface CreateSubscriptionInput {
  requestId: string;
  protocol: string;
  amountCents: number;
  installments: number;
  billingDay: number;
  customer: { name: string; email: string; taxIdHash: string };
  cardToken: string;
}

export interface SubscriptionResult {
  authorizationId: string;
  status: PaymentStatus;
}

export interface WebhookEvent {
  providerChargeId: string;
  status: PaymentStatus;
  type: string;
  paidAt?: Date;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult>;
  cancel(providerChargeId: string): Promise<void>;
  /** Valida a assinatura do webhook e converte para um evento normalizado. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
}
