import { test } from "node:test";
import assert from "node:assert/strict";
import { positionedPrice, simulate, referenceIsStale } from "../src/lib/pricing";
import { isValidCpf, isValidPhone, ageFrom } from "../src/lib/validators";
import { emprestimoSchema, trackSchema } from "../src/lib/schemas";
import { isValidStatus } from "../src/lib/status";

test("preço posicionado = referência × 0,80 (padrão)", () => {
  assert.equal(positionedPrice(180000), 144000);
  assert.equal(positionedPrice(200000, 10), 180000);
  assert.throws(() => positionedPrice(0));
});

test("simulador: exemplo Econômico 12 meses", () => {
  const s = simulate({ baseMonthlyCents: 144000, termMonths: 12, termAdjustments: { "12": 0 } });
  assert.equal(s.monthlyCents, 144000);
  assert.equal(s.firstInstallmentCents, 144000);
  assert.equal(s.remainingInstallments, 11);
  assert.equal(s.totalCents, 1728000);
  assert.equal(simulate({ baseMonthlyCents: 144000, termMonths: 36, termAdjustments: {} }).totalCents, 5184000);
  assert.throws(() => simulate({ baseMonthlyCents: 1, termMonths: 18, termAdjustments: {} }));
});

test("referência desatualizada", () => {
  assert.equal(referenceIsStale(null), true);
  assert.equal(referenceIsStale(new Date()), false);
  assert.equal(referenceIsStale(new Date(Date.now() - 90 * 86400000)), true);
});

test("validadores", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
  assert.equal(isValidCpf("111.111.111-11"), false);
  assert.equal(isValidPhone("(11) 98765-4321"), true);
  assert.equal(isValidPhone("123"), false);
  assert.equal(ageFrom("2000-01-01", new Date("2020-01-02")), 20);
});

test("empréstimo respeita o limite de R$ 3.000", () => {
  const s = emprestimoSchema(300000, 30000).shape.loan;
  assert.equal(s.safeParse({ amount: 3000, dueDay: 10 }).success, true);
  assert.equal(s.safeParse({ amount: 3000.01, dueDay: 10 }).success, false);
});

test("acompanhamento exige protocolo + código", () => {
  assert.equal(trackSchema.safeParse({ protocol: "PC-LVB-20261124-ABCDE", accessCode: "ABCD2345" }).success, true);
  assert.equal(trackSchema.safeParse({ protocol: "52998224725", accessCode: "" }).success, false);
});

test("status por serviço", () => {
  assert.equal(isValidStatus("LVB", "RETIRADA_AGENDADA"), true);
  assert.equal(isValidStatus("CNPJ", "RETIRADA_AGENDADA"), false);
});
