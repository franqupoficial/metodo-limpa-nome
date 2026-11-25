import { test } from "node:test";
import assert from "node:assert/strict";
import { priceView, pixPrice, installmentPlan, maxInstallmentsFor, promoActive, evaluateCoupon, type PaymentConfig } from "../../src/lib/pricing";
import { effectivePermissions } from "../../src/lib/permissions";
import { canTransition, allowedTransitions } from "../../src/lib/order-status";
import { isValidCpf, isValidPhone } from "../../src/lib/validators";
import { segmentWhere } from "../../src/lib/segments";
import { tryOnCategoryFor } from "../../src/lib/ai/categories";

const cfg: PaymentConfig = { pixDiscountBps: 700, maxInstallments: 10, interestFreeInstallments: 10, monthlyInterestBps: 0, minInstallmentCents: 10000 };

test("preço Pix: 7% padrão e preço Pix explícito do produto", () => {
  assert.equal(pixPrice(415800, cfg), 386694); // valor publicado no site original (R$ 3.866,94)
  assert.equal(pixPrice(415800, cfg, 380000), 380000);
  assert.equal(pixPrice(415800, cfg, 999999), 386694, "Pix maior que o preço é ignorado");
});

test("parcelamento: máximo da loja, do produto e parcela mínima", () => {
  assert.equal(maxInstallmentsFor(415800, cfg), 10);
  assert.equal(maxInstallmentsFor(415800, cfg, 6), 6);
  assert.equal(maxInstallmentsFor(35000, cfg), 3, "parcela mínima de R$ 100");
  assert.equal(maxInstallmentsFor(5000, cfg), 1);
  assert.deepEqual(installmentPlan(415800, 10, cfg), { n: 10, value: 41580, total: 415800, interest: 0 });
});

test("parcelamento com juros (tabela Price) acima das parcelas sem juros", () => {
  const c = { ...cfg, interestFreeInstallments: 6, monthlyInterestBps: 199 };
  assert.equal(installmentPlan(100000, 6, c).interest, 0);
  const p = installmentPlan(100000, 10, c);
  assert.ok(p.interest > 0 && p.total === p.value * 10);
});

test("promoção só vale dentro da janela e com preço 'de' maior", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  assert.equal(promoActive({ priceCents: 100, compareAtCents: 150 }, now), true);
  assert.equal(promoActive({ priceCents: 100, compareAtCents: 90 }, now), false);
  assert.equal(promoActive({ priceCents: 100, compareAtCents: 150, promoEndsAt: new Date("2026-11-01") }, now), false);
  assert.equal(promoActive({ priceCents: 100, compareAtCents: 150, promoStartsAt: new Date("2026-12-01") }, now), false);
  const v = priceView({ priceCents: 8000, compareAtCents: 10000 }, cfg, now);
  assert.equal(v.discountPct, 20);
});

test("cupons: percentual, fixo, mínimo, limite, vigência, primeira compra e categoria", () => {
  const base = { code: "X", usedCount: 0, active: true };
  assert.deepEqual(evaluateCoupon({ ...base, type: "PERCENT", value: 1000 }, { subtotalCents: 50000 }), { ok: true, discountCents: 5000, freeShipping: false });
  assert.deepEqual(evaluateCoupon({ ...base, type: "PERCENT", value: 5000, maxDiscountCents: 3000 }, { subtotalCents: 50000 }), { ok: true, discountCents: 3000, freeShipping: false });
  assert.equal(evaluateCoupon({ ...base, type: "FIXED", value: 99999 }, { subtotalCents: 50000 }).ok && (evaluateCoupon({ ...base, type: "FIXED", value: 99999 }, { subtotalCents: 50000 }) as { discountCents: number }).discountCents, 50000);
  assert.equal(evaluateCoupon({ ...base, type: "FIXED", value: 100, minSubtotalCents: 60000 }, { subtotalCents: 50000 }).ok, false);
  assert.equal(evaluateCoupon({ ...base, type: "FIXED", value: 100, maxUses: 1, usedCount: 1 }, { subtotalCents: 50000 }).ok, false);
  assert.equal(evaluateCoupon({ ...base, type: "FIXED", value: 100, endsAt: new Date("2020-01-01") }, { subtotalCents: 50000 }).ok, false);
  assert.equal(evaluateCoupon({ ...base, type: "FIXED", value: 100, firstOrderOnly: true }, { subtotalCents: 50000, customerOrders: 2 }).ok, false);
  assert.equal(evaluateCoupon({ ...base, type: "PERCENT", value: 1000, categoryIds: ["a"] }, { subtotalCents: 50000, eligibleSubtotalCents: 0 }).ok, false);
  assert.deepEqual(evaluateCoupon({ ...base, type: "PERCENT", value: 1000, categoryIds: ["a"] }, { subtotalCents: 50000, eligibleSubtotalCents: 20000 }), { ok: true, discountCents: 2000, freeShipping: false });
  assert.equal(evaluateCoupon({ ...base, active: false, type: "FREE_SHIPPING", value: 0 }, { subtotalCents: 1 }).ok, false);
});

test("permissões: perfis, concessões e retiradas (proprietário nunca perde acesso)", () => {
  const op = effectivePermissions("OPERATOR");
  assert.ok(op.has("orders.update") && !op.has("finance.view") && !op.has("products.edit"));
  assert.ok(effectivePermissions("OPERATOR", ["finance.view"]).has("finance.view"));
  assert.ok(!effectivePermissions("ADMIN", [], ["products.delete"]).has("products.delete"));
  assert.ok(effectivePermissions("OWNER", [], ["users.manage"]).has("users.manage"));
  assert.ok(!effectivePermissions("MARKETING").has("orders.view"));
  assert.ok(!effectivePermissions("MANAGER").has("users.manage"));
});

test("status do pedido: transições permitidas", () => {
  assert.ok(canTransition("PAID", "PICKING"));
  assert.ok(canTransition("SHIPPED", "DELIVERED"));
  assert.ok(!canTransition("AWAITING_PAYMENT", "SHIPPED"), "não envia sem pagamento");
  assert.ok(!canTransition("DELIVERED", "CANCELED"));
  assert.deepEqual(allowedTransitions("CANCELED"), []);
});

test("validações: CPF e telefone", () => {
  assert.ok(isValidCpf("529.982.247-25"));
  assert.ok(!isValidCpf("111.111.111-11"));
  assert.ok(!isValidCpf("529.982.247-24"));
  assert.ok(isValidPhone("(41) 98784-6509"));
  assert.ok(!isValidPhone("1234"));
});

test("segmentos geram filtros coerentes", () => {
  const w = segmentWhere({ minOrders: 2, optIn: true }) as { AND: object[] };
  assert.ok(JSON.stringify(w).includes('"gte":2') && JSON.stringify(w).includes("marketingOptIn"));
});

test("provador: categoria da peça", () => {
  assert.equal(tryOnCategoryFor("Anel Oval Safira"), "aneis");
  assert.equal(tryOnCategoryFor("Pingente Nossa Senhora"), "pingentes");
  assert.equal(tryOnCategoryFor("Corrente Malha Cartier"), "correntes");
  assert.equal(tryOnCategoryFor("Brinco de Pérola"), "brincos");
  assert.equal(tryOnCategoryFor("Tornozeleira de Ouro"), null); // tornozelo não é região do provador
  assert.equal(tryOnCategoryFor("Conjunto"), null);
});
