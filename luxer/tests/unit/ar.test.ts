import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ringPose, wristPose, earPose, neckPose, smoothPose, type P } from "../../src/components/luxe/ar/pose";

// mão sintética (21 pontos do MediaPipe), dedos apontando para cima
const hand: P[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
hand[0] = { x: 0.5, y: 0.8 };
hand[5] = { x: 0.4, y: 0.55 }; hand[9] = { x: 0.47, y: 0.53 }; hand[13] = { x: 0.54, y: 0.54 }; hand[17] = { x: 0.6, y: 0.57 };
hand[14] = { x: 0.55, y: 0.44 };

test("anel: entre as articulações 13 e 14, alinhado ao dedo, largura pelo espaçamento das articulações", () => {
  const p = ringPose(hand, 1000, 1000);
  assert.ok(p.y < 540 && p.y > 440 && p.visible);
  assert.ok(Math.abs(p.angle - Math.atan2(-100, 10)) < 1e-9, "ângulo deve seguir o dedo (para cima)");
  assert.ok(p.size > 50 && p.size < 80, `largura do dedo ${p.size}`);
});

test("pulseira: abaixo do ponto do pulso, na direção do antebraço", () => {
  const p = wristPose(hand, 1000, 1000);
  assert.ok(p.y > 800, "deve ficar um pouco além do pulso, no antebraço");
  assert.ok(p.size > 150 && p.size < 200);
});

test("brinco e colar a partir da malha do rosto", () => {
  const face: P[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  face[234] = { x: 0.35, y: 0.45 }; face[454] = { x: 0.65, y: 0.45 }; face[1] = { x: 0.53, y: 0.45 };
  face[132] = { x: 0.37, y: 0.6 }; face[361] = { x: 0.63, y: 0.6 }; face[152] = { x: 0.53, y: 0.7 };
  const e = earPose(face, 1000, 1000);
  assert.ok(e.x < 400, "nariz apontando à direita: orelha esquerda é a mais visível");
  assert.ok(e.y > 450 && e.y < 600 && Math.abs(e.size - 300) < 1);
  const n = neckPose(face, 1000, 1000);
  assert.ok(n.y > 700, "colar abaixo do queixo");
});

test("suavização: aproxima sem saltar e gira pelo caminho mais curto", () => {
  const a = { x: 0, y: 0, size: 10, angle: Math.PI - 0.1, visible: true };
  const b = { x: 100, y: 0, size: 20, angle: -Math.PI + 0.1, visible: true };
  const s = smoothPose(a, b, 0.5);
  assert.equal(s.x, 50);
  assert.ok(Math.abs(Math.abs(s.angle) - Math.PI) < 0.11, "deve passar por ±π, não dar a volta inteira");
  assert.deepEqual(smoothPose(null, b), b);
});

test("WASM do CDN na mesma versão do pacote instalado", () => {
  const pkg = JSON.parse(readFileSync("node_modules/@mediapipe/tasks-vision/package.json", "utf8"));
  const src = readFileSync("src/components/luxe/ar/tracker.ts", "utf8");
  assert.ok(src.includes(`MEDIAPIPE_VERSION = "${pkg.version}"`), `tracker.ts deve usar ${pkg.version}`);
});

import { earPoses } from "../../src/components/luxe/ar/pose";
test("brincos: dois lóbulos de frente; com a cabeça girada, a orelha do lado do nariz some", () => {
  const face: P[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  face[234] = { x: 0.35, y: 0.45 }; face[454] = { x: 0.65, y: 0.45 }; face[132] = { x: 0.37, y: 0.6 }; face[361] = { x: 0.63, y: 0.6 };
  face[1] = { x: 0.5, y: 0.45 };
  let e = earPoses(face, 1000, 1000);
  assert.ok(e.left.visible && e.right.visible && e.left.x < 360 && e.right.x > 640);
  face[1] = { x: 0.62, y: 0.45 };
  e = earPoses(face, 1000, 1000);
  assert.ok(e.left.visible && !e.right.visible);
});

import { rolesFor } from "../../src/components/luxe/ar/roles";
const pc = (area: number, compact: boolean, aspect = 1) => ({ canvas: null as never, thumb: "", aspect, cx: 0, area, compact });

test("usos oferecidos por peça: nunca anel como pingente nem colar para par de brincos", () => {
  // conjunto anel + par de brincos de pérola
  assert.deepEqual(rolesFor("ear", true, "Conjunto Pérola em Ouro 18 Kilates", [pc(900, true, 0.8), pc(300, true), pc(310, true)]), ["ear", "hand"]);
  // conjunto colar (estendido na foto) + brincos
  assert.deepEqual(rolesFor("ear", true, "Jogo Colar e Brinco Zircônia", [pc(2000, false, 1.6), pc(200, true), pc(205, true)]), ["ear", "neck"]);
  // par de brincos: só brinco
  assert.deepEqual(rolesFor("ear", false, "Brinco Argola", [pc(200, true), pc(205, true)]), ["ear"]);
  // pingente: só colar
  assert.deepEqual(rolesFor("neck", false, "Pingente Gota", [pc(500, true)]), ["neck"]);
});
