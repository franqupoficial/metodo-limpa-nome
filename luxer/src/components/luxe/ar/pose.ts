/**
 * Geometria do provador AR (funções puras, testadas em tests/unit/ar.test.ts).
 * Pontos do MediaPipe chegam normalizados (0–1) e são convertidos para pixels do quadro.
 */
export type P = { x: number; y: number; z?: number };
export type Pose = { x: number; y: number; angle: number; size: number; visible: boolean };
export type ARRegion = "hand" | "wrist" | "ear" | "neck";

const px = (p: P, w: number, h: number) => ({ x: p.x * w, y: p.y * h });
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const lerpP = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/**
 * Anel: entre a base (13, MCP) e a primeira articulação (14, PIP) do dedo anelar, a ~38% da base.
 * A largura do dedo é estimada pelo espaçamento entre as articulações vizinhas (9 e 17), que acompanha a largura dos dedos.
 */
export function ringPose(lm: P[], w: number, h: number): Pose {
  const m13 = px(lm[13], w, h), p14 = px(lm[14], w, h), m9 = px(lm[9], w, h), m17 = px(lm[17], w, h);
  const c = lerpP(m13, p14, 0.38);
  const size = ((dist(m13, m9) + dist(m13, m17)) / 2) * 0.92;
  return { x: c.x, y: c.y, angle: Math.atan2(p14.y - m13.y, p14.x - m13.x), size, visible: size > 6 };
}

/** Pulseira: um pouco acima do ponto do pulso (0), na direção do antebraço; largura proporcional à palma (5↔17). */
export function wristPose(lm: P[], w: number, h: number): Pose {
  const w0 = px(lm[0], w, h), m9 = px(lm[9], w, h), i5 = px(lm[5], w, h), p17 = px(lm[17], w, h);
  const c = { x: w0.x + (w0.x - m9.x) * 0.16, y: w0.y + (w0.y - m9.y) * 0.16 };
  const size = dist(i5, p17) * 0.82;
  return { x: c.x, y: c.y, angle: Math.atan2(w0.y - m9.y, w0.x - m9.x), size, visible: size > 8 };
}

/**
 * Brinco: lóbulo da orelha mais visível, a partir da malha do rosto (FaceLandmarker, 478 pontos):
 * 234/454 = extremidades do rosto na altura da orelha; 132/361 = mandíbula logo abaixo.
 * size = largura do rosto (≈ 14 cm), usada como régua para a escala real da peça.
 */
export function earPose(lm: P[], w: number, h: number): Pose {
  const l = px(lm[234], w, h), r = px(lm[454], w, h), nose = px(lm[1], w, h);
  const faceW = dist(l, r);
  // a orelha mais visível é a do lado oposto ao que o nariz aponta
  const useLeft = Math.abs(nose.x - l.x) > Math.abs(nose.x - r.x);
  const edge = useLeft ? l : r, jaw = px(lm[useLeft ? 132 : 361], w, h);
  const lobe = lerpP(edge, jaw, 0.42);
  const out = useLeft ? -1 : 1;
  return { x: lobe.x + out * faceW * 0.02, y: lobe.y, angle: Math.atan2(r.y - l.y, r.x - l.x), size: faceW, visible: faceW > 30 };
}

/** Colar/pingente: base do pescoço, abaixo do queixo (152) na direção nariz→queixo; size = largura do rosto. */
export function neckPose(lm: P[], w: number, h: number): Pose {
  const chin = px(lm[152], w, h), nose = px(lm[1], w, h), l = px(lm[234], w, h), r = px(lm[454], w, h);
  const faceW = dist(l, r), down = { x: chin.x - nose.x, y: chin.y - nose.y }, len = Math.hypot(down.x, down.y) || 1;
  const k = faceW * 0.62;
  return { x: chin.x + (down.x / len) * k, y: chin.y + (down.y / len) * k, angle: Math.atan2(r.y - l.y, r.x - l.x), size: faceW, visible: faceW > 30 };
}

/** Interpolação para eliminar tremulação: posição, escala e ângulo (pelo caminho mais curto). */
export function smoothPose(prev: Pose | null, next: Pose, alpha = 0.35): Pose {
  if (!prev || !prev.visible) return next;
  let da = next.angle - prev.angle;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  return { x: prev.x + (next.x - prev.x) * alpha, y: prev.y + (next.y - prev.y) * alpha, size: prev.size + (next.size - prev.size) * alpha, angle: prev.angle + da * alpha, visible: next.visible };
}
