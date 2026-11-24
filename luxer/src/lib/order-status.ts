import type { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAID: "Pagamento aprovado",
  PICKING: "Em separação",
  READY_TO_SHIP: "Pronto para envio",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, "amber" | "green" | "blue" | "violet" | "slate" | "red" | "gray"> = {
  AWAITING_PAYMENT: "amber",
  PAID: "green",
  PICKING: "blue",
  READY_TO_SHIP: "violet",
  SHIPPED: "blue",
  DELIVERED: "green",
  CANCELED: "red",
  REFUNDED: "gray",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  AUTHORIZED: "Autorizado",
  PAID: "Pago",
  FAILED: "Recusado",
  CANCELED: "Cancelado",
  REFUNDED: "Reembolsado",
  PARTIALLY_REFUNDED: "Reembolso parcial",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = { PIX: "Pix", CREDIT_CARD: "Cartão de crédito" };

/** Transições permitidas manualmente no painel. Pagamento aprovado e reembolso seguem pelo gateway. */
const MANUAL: Record<OrderStatus, OrderStatus[]> = {
  AWAITING_PAYMENT: ["CANCELED"],
  PAID: ["PICKING", "READY_TO_SHIP", "SHIPPED", "CANCELED"],
  PICKING: ["READY_TO_SHIP", "SHIPPED", "PAID", "CANCELED"],
  READY_TO_SHIP: ["SHIPPED", "PICKING", "CANCELED"],
  SHIPPED: ["DELIVERED", "READY_TO_SHIP"],
  DELIVERED: ["SHIPPED"],
  CANCELED: [],
  REFUNDED: [],
};

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return MANUAL[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return MANUAL[from].includes(to);
}

/** Pedidos que contam como venda (faturamento) — pagamento confirmado e não estornado. */
export const REVENUE_STATUSES: OrderStatus[] = ["PAID", "PICKING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"];
export const OPEN_FULFILLMENT: OrderStatus[] = ["PAID", "PICKING", "READY_TO_SHIP"];

/** Etapas exibidas ao cliente na página do pedido. */
export const CUSTOMER_TIMELINE: OrderStatus[] = ["AWAITING_PAYMENT", "PAID", "PICKING", "SHIPPED", "DELIVERED"];
