// Regras de preço puras (sem acesso a banco) — testadas em tests/unit/pricing.test.ts

export type PaymentConfig = {
  pixDiscountBps: number;
  maxInstallments: number;
  interestFreeInstallments: number;
  monthlyInterestBps: number;
  minInstallmentCents: number;
};

export type PriceInput = {
  priceCents: number;
  compareAtCents?: number | null;
  pixPriceCents?: number | null;
  promoStartsAt?: Date | null;
  promoEndsAt?: Date | null;
  maxInstallments?: number | null;
};

export type PriceView = {
  /** preço de venda vigente */
  price: number;
  /** preço "de", somente quando houver promoção vigente */
  compareAt: number | null;
  pix: number;
  installments: number;
  installmentValue: number;
  discountPct: number | null;
};

/** A promoção só vale dentro da janela configurada. Fora dela, o preço "de" volta a ser o preço de venda. */
export function promoActive(p: PriceInput, now = new Date()): boolean {
  if (!p.compareAtCents || p.compareAtCents <= p.priceCents) return false;
  if (p.promoStartsAt && now < p.promoStartsAt) return false;
  if (p.promoEndsAt && now > p.promoEndsAt) return false;
  return true;
}

export function pixPrice(priceCents: number, cfg: Pick<PaymentConfig, "pixDiscountBps">, explicit?: number | null): number {
  if (explicit != null && explicit > 0 && explicit <= priceCents) return explicit;
  return Math.round((priceCents * (10000 - cfg.pixDiscountBps)) / 10000);
}

export function maxInstallmentsFor(totalCents: number, cfg: PaymentConfig, productMax?: number | null): number {
  const cap = Math.min(cfg.maxInstallments, productMax ?? cfg.maxInstallments);
  const byMin = cfg.minInstallmentCents > 0 ? Math.floor(totalCents / cfg.minInstallmentCents) : cap;
  return Math.max(1, Math.min(cap, byMin));
}

/** Tabela Price para parcelas com juros; sem juros até interestFreeInstallments. */
export function installmentPlan(totalCents: number, n: number, cfg: PaymentConfig): { n: number; value: number; total: number; interest: number } {
  if (n <= 1 || n <= cfg.interestFreeInstallments || cfg.monthlyInterestBps <= 0) {
    const value = Math.ceil(totalCents / Math.max(1, n));
    return { n, value, total: totalCents, interest: 0 };
  }
  const i = cfg.monthlyInterestBps / 10000;
  const value = Math.ceil((totalCents * i) / (1 - Math.pow(1 + i, -n)));
  const total = value * n;
  return { n, value, total, interest: total - totalCents };
}

export function priceView(p: PriceInput, cfg: PaymentConfig, now = new Date()): PriceView {
  const active = promoActive(p, now);
  const price = p.priceCents;
  const compareAt = active ? p.compareAtCents! : null;
  const installments = maxInstallmentsFor(price, cfg, p.maxInstallments);
  return {
    price,
    compareAt,
    pix: pixPrice(price, cfg, p.pixPriceCents),
    installments,
    installmentValue: installmentPlan(price, installments, cfg).value,
    discountPct: compareAt ? Math.round((1 - price / compareAt) * 100) : null,
  };
}

// ─────────────── Cupons ───────────────

export type CouponRule = {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minSubtotalCents?: number | null;
  maxDiscountCents?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  maxUses?: number | null;
  usedCount: number;
  active: boolean;
  firstOrderOnly?: boolean;
  categoryIds?: string[];
};

export type CouponContext = {
  subtotalCents: number;
  /** subtotal elegível quando o cupom é restrito a categorias */
  eligibleSubtotalCents?: number;
  customerOrders?: number;
  customerUses?: number;
  usesPerCustomer?: number | null;
  now?: Date;
};

export type CouponResult = { ok: true; discountCents: number; freeShipping: boolean } | { ok: false; error: string };

export function evaluateCoupon(c: CouponRule, ctx: CouponContext): CouponResult {
  const now = ctx.now ?? new Date();
  if (!c.active) return { ok: false, error: "Cupom inválido." };
  if (c.startsAt && now < c.startsAt) return { ok: false, error: "Este cupom ainda não está vigente." };
  if (c.endsAt && now > c.endsAt) return { ok: false, error: "Este cupom expirou." };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { ok: false, error: "Este cupom atingiu o limite de usos." };
  if (c.minSubtotalCents && ctx.subtotalCents < c.minSubtotalCents)
    return { ok: false, error: `Cupom válido para compras a partir de ${(c.minSubtotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.` };
  if (c.firstOrderOnly && (ctx.customerOrders ?? 0) > 0) return { ok: false, error: "Cupom válido apenas na primeira compra." };
  if (ctx.usesPerCustomer != null && (ctx.customerUses ?? 0) >= ctx.usesPerCustomer) return { ok: false, error: "Você já utilizou este cupom." };
  const base = c.categoryIds?.length ? ctx.eligibleSubtotalCents ?? 0 : ctx.subtotalCents;
  if (c.categoryIds?.length && base <= 0) return { ok: false, error: "Nenhum produto do carrinho é elegível para este cupom." };
  if (c.type === "FREE_SHIPPING") return { ok: true, discountCents: 0, freeShipping: true };
  let discount = c.type === "PERCENT" ? Math.round((base * c.value) / 10000) : c.value;
  if (c.maxDiscountCents) discount = Math.min(discount, c.maxDiscountCents);
  discount = Math.min(discount, base);
  return { ok: true, discountCents: discount, freeShipping: false };
}
