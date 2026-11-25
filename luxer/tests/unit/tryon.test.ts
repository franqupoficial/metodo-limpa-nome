import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanBox, cropRect, blendEllipse, centerAspect, fidelityScore, toRect } from "../../src/lib/ai/tryon-geometry";
import { tryOnCategoryFor, REGION_OF } from "../../src/lib/ai/categories";

test("caixa do modelo: ordena, limita a 0–1000 e rejeita degeneradas", () => {
  assert.deepEqual(cleanBox([600, 700, 400, 300]), [400, 300, 600, 700]);
  assert.deepEqual(cleanBox([-20, 10, 1200, 50]), [0, 10, 1000, 50]);
  assert.equal(cleanBox([10, 10, 11, 11]), null);
  assert.equal(cleanBox("x"), null);
  assert.equal(cleanBox([1, 2, 3]), null);
});

test("recorte fica dentro da foto e contém o ponto de aplicação", () => {
  for (const [box, region] of [[[450, 480, 520, 540], "hand"], [[10, 900, 60, 990], "ear"], [[300, 300, 500, 700], "neck"], [[880, 0, 990, 80], "wrist"]] as const) {
    const r = cropRect([...box] as [number, number, number, number], region, 1200, 1600);
    const t = toRect([...box] as [number, number, number, number], 1200, 1600);
    assert.ok(r.left >= 0 && r.top >= 0 && r.left + r.width <= 1200 && r.top + r.height <= 1600, `${region} fora da imagem`);
    assert.ok(t.left >= r.left && t.top >= r.top && t.left + t.width <= r.left + r.width && t.top + t.height <= r.top + r.height, `${region} não contém o alvo`);
  }
});

test("anel: recorte pequeno (mais resolução na joia); colar: recorte amplo", () => {
  const ring = cropRect([480, 500, 520, 530], "hand", 1200, 1600);
  const neck = cropRect([350, 350, 500, 650], "neck", 1200, 1600);
  assert.ok(ring.width < 600 && neck.width > 600);
});

test("elipse de mesclagem centrada no alvo e limitada ao recorte", () => {
  const crop = cropRect([480, 500, 520, 530], "hand", 1200, 1600);
  const e = blendEllipse([480, 500, 520, 530], crop, "hand", 1200, 1600);
  const t = toRect([480, 500, 520, 530], 1200, 1600);
  assert.ok(Math.abs(e.cx - (t.left + t.width / 2 - crop.left)) < 1);
  assert.ok(e.rx <= crop.width / 2 && e.ry <= crop.height / 2 && e.feather >= 6);
});

test("ajuste de proporção sem distorcer", () => {
  assert.deepEqual(centerAspect(1000, 500, 1), { left: 250, top: 0, width: 500, height: 500 });
  assert.deepEqual(centerAspect(500, 1000, 1), { left: 0, top: 250, width: 500, height: 500 });
});

test("fidelidade: peça ausente ou fora do lugar zera; divergências descontam", () => {
  const ok = { jewelry_present: true, placed_on_target: true, same_design_score: 90, metal_color_match: true, stones_match: true, scale_plausible: true, person_unchanged: true };
  assert.equal(fidelityScore(ok), 90);
  assert.equal(fidelityScore({ ...ok, jewelry_present: false }), 0);
  assert.equal(fidelityScore({ ...ok, placed_on_target: false }), 0);
  assert.equal(fidelityScore({ ...ok, stones_match: false, metal_color_match: false }), 60);
  assert.equal(fidelityScore({ ...ok, same_design_score: 40, person_unchanged: false }), 20);
});

test("categorias do provador e regiões do corpo", () => {
  assert.equal(REGION_OF[tryOnCategoryFor("Anel Solitário em Ouro 18k")!], "hand");
  assert.equal(REGION_OF[tryOnCategoryFor("Brinco de Pérola")!], "ear");
  assert.equal(REGION_OF[tryOnCategoryFor("Pingente Nossa Senhora")!], "neck");
  assert.equal(REGION_OF[tryOnCategoryFor("Corrente Cartier 60cm")!], "neck");
  assert.equal(REGION_OF[tryOnCategoryFor("Pulseira Elos")!], "wrist");
  assert.equal(tryOnCategoryFor("Tornozeleira Coração"), null);
});
