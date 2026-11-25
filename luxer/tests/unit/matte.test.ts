import { test } from "node:test";
import assert from "node:assert/strict";
import { matteWhite, matteResidue, refineWithMask, maskAgrees, keypointFor, labelPieces, suspectPoint, suspectMaskAgrees } from "../../src/components/luxe/ar/matte";

/** Foto sintética de estúdio: fundo branco, sombra neutra, aro dourado com "brilhante" branco no centro e um 2º brinco. */
function studio(w = 120, h = 80) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    let c = [252, 252, 251];
    const r1 = Math.hypot(x - 35, y - 40), r2 = Math.hypot(x - 90, y - 40);
    if (y > 62 && x > 20 && x < 50) c = [226, 226, 225];                         // sombra neutra clara
    if (r1 < 16 && r1 > 10) c = [205, 160, 70];                                    // ouro
    if (r1 <= 10 && r1 > 6) c = [205, 160, 70];
    if (r1 <= 6) c = (x + y) % 2 ? [250, 250, 252] : [196, 200, 214];             // brilhante branco facetado no interior
    if (r2 < 9) c = [200, 155, 68];                                                // segunda peça
    d.set([...c, 255], o);
  }
  return { d, w, h };
}

test("fundo branco e sombra neutra ficam transparentes; brilhante interno permanece opaco", () => {
  const { d, w, h } = studio();
  const r = matteWhite(d, w, h);
  const a = (x: number, y: number) => d[(y * w + x) * 4 + 3];
  assert.equal(a(2, 2), 0, "canto do fundo");
  assert.equal(a(35, 70), 0, "sombra de estúdio");
  assert.equal(a(35, 40), 255, "brilhante branco no interior da peça");
  assert.equal(a(35, 26), 255, "metal");
  const res = matteResidue(d, w, h, r.bg);
  assert.equal(res.borderOpaque, 0);
  assert.ok(res.halo <= 2, `halo branco: ${res.halo}`);
});

test("separa as peças da fotografia (par de brincos / conjunto)", () => {
  const { d, w, h } = studio();
  const r = matteWhite(d, w, h);
  assert.equal(r.pieces.length, 2);
  assert.ok(r.pieces[0].area > r.pieces[1].area);
  assert.ok(r.pieces.some((p) => p.cx < 60) && r.pieces.some((p) => p.cx > 60));
});

test("borda: descontamina o halo (nenhum pixel semitransparente quase branco)", () => {
  const { d, w, h } = studio();
  matteWhite(d, w, h);
  for (let i = 0; i < w * h; i++) {
    const al = d[i * 4 + 3];
    if (al > 0 && al < 255) assert.ok(Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) < 245 || al < 40, "pixel de borda ainda branco");
  }
});

test("miolo de um aro (fundo visto através da peça) fica transparente", () => {
  const w = 100, h = 100, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = Math.hypot(x - 50, y - 50);
    d.set([...(r > 22 && r < 30 ? [205, 160, 70] : [253, 253, 253]), 255], (y * w + x) * 4);
  }
  matteWhite(d, w, h);
  assert.equal(d[(50 * w + 50) * 4 + 3], 0, "miolo do aro");
  assert.equal(d[(50 * w + 76) * 4 + 3], 255, "metal do aro");
});

test("ouro branco (neutro, claro, com textura) não é confundido com sombra", () => {
  const w = 80, h = 60, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const metal = x > 20 && x < 60 && y > 20 && y < 40;
    d.set([...(metal ? ((x + y) % 3 ? [222, 223, 225] : [196, 198, 201]) : [253, 253, 253]), 255], (y * w + x) * 4);
  }
  matteWhite(d, w, h);
  let kept = 0; for (let y = 22; y < 38; y++) for (let x = 22; x < 58; x++) if (d[(y * w + x) * 4 + 3] > 170) kept++;
  assert.ok(kept > 36 * 16 * 0.95, `ouro branco preservado: ${kept}`);
});

test("furos pequenos de filigrana (cor exata do fundo, lisos) ficam transparentes", () => {
  const w = 120, h = 80, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const plate = x > 20 && x < 100 && y > 15 && y < 65;
    const hole = plate && ((x - 30) % 20 < 8) && ((y - 25) % 20 < 8) && x > 28 && y > 23;
    d.set([...(plate && !hole ? ((x * 7 + y) % 5 ? [205, 160, 70] : [180, 140, 60]) : [253, 253, 253]), 255], (y * w + x) * 4);
  }
  matteWhite(d, w, h);
  assert.equal(d[(27 * w + 33) * 4 + 3], 0, "furo da filigrana");
  assert.equal(d[(20 * w + 25) * 4 + 3], 255, "metal");
});

test("pérola branca sobre fundo branco: corpo e reflexo especular permanecem (não viram furo nem sombra)", () => {
  const w = 120, h = 120, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = Math.hypot(x - 60, y - 60), spec = Math.hypot(x - 50, y - 48);
    let c = [253, 253, 253];
    if (y > 88 && y < 100 && Math.abs(x - 60) < 30) c = [236, 236, 236];             // sombra neutra
    if (r < 26) { const t = r / 26; c = [Math.round(250 - 30 * t), Math.round(244 - 34 * t), Math.round(236 - 40 * t)]; } // pérola creme com gradiente
    if (spec < 5) c = [255, 255, 255];                                                 // reflexo especular
    if (r >= 25 && r < 26.5) c = [196, 184, 170];                                      // contorno da pérola
    d.set([...c, 255], (y * w + x) * 4);
  }
  matteWhite(d, w, h, { pearl: true });
  const a = (x: number, y: number) => d[(y * w + x) * 4 + 3];
  assert.equal(a(50, 48), 255, "reflexo especular da pérola");
  assert.equal(a(60, 78), 255, "parte de baixo da pérola");
  assert.equal(a(60, 60), 255, "centro da pérola");
  assert.equal(a(60, 95), 0, "sombra de estúdio");
  assert.equal(a(3, 3), 0, "fundo");
});

/** Pérola quase da cor do fundo, com o pino dourado: a cor só acha o pino; a máscara (segmentador) acha a pérola. */
function pearlOnWhite(w = 80, h = 80) {
  const d = new Uint8ClampedArray(w * h * 4), mask = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, r = Math.hypot(x - 40, y - 50);
    let c = [252, 252, 251];
    if (r < 18) c = [249, 248, 246];                                   // pérola: lisa e quase igual ao fundo
    if (x >= 37 && x <= 43 && y >= 4 && y < 33) c = [200, 155, 68];    // pino de ouro
    if (y > 70 && Math.abs(x - 40) < 14) c = [232, 232, 231];          // sombra de estúdio
    d.set([...c, 255], o);
    if (r < 18 || (x >= 37 && x <= 43 && y >= 4 && y < 33)) mask[y * w + x] = 0.97;
    else if (r < 19.5) mask[y * w + x] = 0.7;                           // borda suave da máscara
  }
  return { d, w, h, mask };
}

test("refino por máscara: a pérola volta inteira e opaca; fundo e sombra seguem transparentes", () => {
  const { d, w, h, mask } = pearlOnWhite();
  const orig = new Uint8ClampedArray(d);
  const r = matteWhite(d, w, h, { pearl: true });
  const a = (x: number, y: number) => d[(y * w + x) * 4 + 3];
  assert.ok(a(40, 50) < 128, "sem refino, a cor sozinha perde a pérola (é o caso que o segmentador resolve)");
  const idx = r.pieces.findIndex((p) => p.cx > 30 && p.cx < 50);
  assert.ok(idx >= 0);
  assert.ok(maskAgrees(mask, d, r.labels, idx));
  const k = keypointFor(d, r.labels, idx, r.pieces[idx], w, h);
  assert.ok(Math.abs(k.x - 0.5) < 0.05 && k.y > 0.04 && k.y < 0.42, `ponto de clique sobre o pino: ${JSON.stringify(k)}`);
  assert.ok(refineWithMask(d, orig, r.bg, mask) > 0);
  assert.equal(a(40, 50), 255, "corpo da pérola");
  assert.deepEqual([...d.slice((50 * w + 40) * 4, (50 * w + 40) * 4 + 3)], [249, 248, 246], "cor original da pérola");
  assert.equal(a(2, 2), 0, "fundo");
  assert.equal(a(40, 75), 0, "sombra");
  const again = labelPieces(d, w, h);
  assert.equal(again.pieces.length, 1, "pino e pérola formam uma peça só");
  // borda da máscara: semitransparente e descontaminada (sem halo branco)
  const res = matteResidue(d, w, h, r.bg);
  assert.equal(res.borderOpaque, 0);
});

test("máscara incoerente (vaza para o fundo ou não cobre a peça) é descartada", () => {
  const { d, w, h } = pearlOnWhite();
  const r = matteWhite(d, w, h, { pearl: true });
  const idx = 0;
  assert.equal(maskAgrees(new Float32Array(w * h).fill(0.9), d, r.labels, idx), false, "vazou para a foto toda");
  assert.equal(maskAgrees(new Float32Array(w * h), d, r.labels, idx), false, "não cobre a peça");
  const fuzzy = new Float32Array(w * h).map((_, i) => (Math.hypot((i % w) - 40, ((i / w) | 0) - 40) < 30 ? 0.6 : 0));
  assert.equal(maskAgrees(fuzzy, d, r.labels, idx), false, "nuvem difusa (clique no metal fino)");
});

test("ponto de clique: o mais interno da peça (não o vão central de um aro)", () => {
  const { d, w, h } = studio();
  const r = matteWhite(d, w, h);
  const idx = r.pieces.findIndex((p) => p.cx < 60);
  const k = keypointFor(d, r.labels, idx, r.pieces[idx], w, h);
  const i = Math.floor(k.y * h) * w + Math.floor(k.x * w);
  assert.equal(r.labels[i], idx);
  assert.equal(d[i * 4 + 3], 255);
});

test("2º clique: acha a pérola apagada pela cor ao lado do metal; limpeza não mexe em outra peça", () => {
  const { d, w, h, mask } = pearlOnWhite();
  const orig = new Uint8ClampedArray(d);
  const r = matteWhite(d, w, h, { pearl: true });
  const idx = r.pieces.findIndex((p) => p.cx > 30 && p.cx < 50), p = r.pieces[idx];
  const sp = suspectPoint(orig, d, r.bg, p, w, h);
  assert.ok(sp, "região suspeita encontrada");
  assert.ok(Math.hypot(sp!.x * w - 40, sp!.y * h - 50) < 15, `clique no corpo da pérola: ${JSON.stringify(sp)}`);
  assert.ok(suspectMaskAgrees(mask, orig, r.bg, r.labels, idx, p, w));
  const allBg = new Float32Array(w * h).fill(0.95);
  assert.equal(suspectMaskAgrees(allBg, orig, r.bg, r.labels, idx, p, w), false, "máscara que pega o fundo");
  // limpeza restrita à caixa: um pixel quase branco opaco longe da peça não é tocado
  const far = (2 * w + 2) * 4; d[far + 3] = 200;
  refineWithMask(d, orig, r.bg, new Float32Array(w * h), p, w);
  assert.equal(d[far + 3], 200);
});
