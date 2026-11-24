import { test } from "node:test";
import assert from "node:assert/strict";
import { allocateForTest } from "./helpers";
import { searchTokens } from "./helpers";

test("rateio do desconto: soma enviada ao gateway é exatamente o total", () => {
  for (const [lines, d] of [[[10000, 20000, 33333], 7777], [[1, 1, 1], 2], [[50000], 4999], [[12345, 67890], 0]] as [number[], number][]) {
    const out = allocateForTest(lines, d);
    assert.equal(out.reduce((a, b) => a + b, 0), lines.reduce((a, b) => a + b, 0) - d);
    assert.ok(out.every((x) => x >= 0));
  }
});

test("busca: normaliza acentos, remove palavras vazias e expande sinônimos", () => {
  const t = searchTokens("Alianças de Ouro com diamante");
  assert.deepEqual(t[0], ["aliancas", "alianca"]);
  assert.ok(t.some((g) => g.includes("brilhante")), "diamante → brilhante");
  assert.ok(!t.some((g) => g.includes("de")));
});
