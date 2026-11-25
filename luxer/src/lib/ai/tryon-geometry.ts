/**
 * Geometria do LUXER AI TRY-ON (funções puras, testadas em tests/unit).
 * Caixas no formato do Gemini: [ymin, xmin, ymax, xmax] normalizadas de 0 a 1000.
 */
import type { BodyRegion } from "./categories";

export type Box = [number, number, number, number];
export type Rect = { left: number; top: number; width: number; height: number };

/** Valida e ordena uma caixa vinda do modelo; null se for inválida ou degenerada. */
export function cleanBox(b: unknown): Box | null {
  if (!Array.isArray(b) || b.length !== 4 || !b.every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  const c = (v: number) => Math.max(0, Math.min(1000, v));
  const [y0, x0, y1, x1] = [c(Math.min(b[0], b[2])), c(Math.min(b[1], b[3])), c(Math.max(b[0], b[2])), c(Math.max(b[1], b[3]))];
  return y1 - y0 < 4 || x1 - x0 < 4 ? null : [y0, x0, y1, x1];
}

export function toRect(b: Box, w: number, h: number): Rect {
  const left = Math.round((b[1] / 1000) * w), top = Math.round((b[0] / 1000) * h);
  return { left, top, width: Math.max(1, Math.round(((b[3] - b[1]) / 1000) * w)), height: Math.max(1, Math.round(((b[2] - b[0]) / 1000) * h)) };
}

/**
 * Quanto contexto ao redor do ponto de aplicação vai para a edição generativa, por região do corpo.
 * Recorte menor = mais resolução na joia e menos risco de alterar o resto da foto.
 */
const CONTEXT: Record<BodyRegion, { scale: number; minFrac: number }> = {
  hand: { scale: 3.2, minFrac: 0.28 },
  ear: { scale: 3.4, minFrac: 0.26 },
  neck: { scale: 1.9, minFrac: 0.4 },
  wrist: { scale: 2.8, minFrac: 0.3 },
};

/** Recorte quadrado (quando a foto permite) centrado no ponto de aplicação, dentro dos limites da imagem. */
export function cropRect(target: Box, region: BodyRegion, w: number, h: number): Rect {
  const t = toRect(target, w, h);
  const { scale, minFrac } = CONTEXT[region];
  const side = Math.min(Math.max(t.width, t.height) * scale, Math.max(w, h)), min = Math.min(w, h) * minFrac;
  const size = Math.round(Math.min(Math.max(side, min), Math.min(w, h)));
  const cx = t.left + t.width / 2, cy = t.top + t.height / 2;
  const left = Math.round(Math.max(0, Math.min(w - size, cx - size / 2)));
  const top = Math.round(Math.max(0, Math.min(h - size, cy - size / 2)));
  return { left, top, width: size, height: size };
}

/** Elipse de mesclagem (em coordenadas do recorte) que cobre o ponto de aplicação com folga. */
export function blendEllipse(target: Box, crop: Rect, region: BodyRegion, w: number, h: number) {
  const t = toRect(target, w, h);
  const pad = { hand: 1.9, ear: 2.3, neck: 1.35, wrist: 1.8 }[region];
  return {
    cx: t.left + t.width / 2 - crop.left,
    cy: t.top + t.height / 2 - crop.top,
    rx: Math.min(crop.width / 2, Math.max(t.width * pad, crop.width * 0.18) / 1),
    ry: Math.min(crop.height / 2, Math.max(t.height * pad, crop.height * 0.18) / 1),
    feather: Math.max(6, Math.round(Math.min(crop.width, crop.height) * 0.06)),
  };
}

/** Corta o centro de uma imagem (w×h) para a proporção desejada, antes de redimensionar sem distorcer. */
export function centerAspect(w: number, h: number, aspect: number): Rect {
  if (w / h > aspect) { const nw = Math.round(h * aspect); return { left: Math.round((w - nw) / 2), top: 0, width: nw, height: h }; }
  const nh = Math.round(w / aspect);
  return { left: 0, top: Math.round((h - nh) / 2), width: w, height: nh };
}

/** Pontuação final de fidelidade a partir do parecer estruturado da verificação. */
export function fidelityScore(v: { jewelry_present?: boolean; placed_on_target?: boolean; same_design_score?: number; metal_color_match?: boolean; stones_match?: boolean; scale_plausible?: boolean; person_unchanged?: boolean }) {
  if (!v.jewelry_present || !v.placed_on_target) return 0;
  let s = Math.max(0, Math.min(100, Math.round(v.same_design_score ?? 0)));
  if (v.metal_color_match === false) s -= 15;
  if (v.stones_match === false) s -= 15;
  if (v.scale_plausible === false) s -= 10;
  if (v.person_unchanged === false) s -= 20;
  return Math.max(0, s);
}

// ─────────── Arquitetura híbrida: articulações da mão medidas no aparelho (MediaPipe) ───────────

export type LM = { x: number; y: number };
/** Aceita somente os 21 pontos normalizados do HandLandmarker (proteção contra dados forjados). */
export function validHandLandmarks(v: unknown): LM[] | null {
  if (!Array.isArray(v) || v.length !== 21) return null;
  const ok = v.every((p) => p && typeof p.x === "number" && typeof p.y === "number" && p.x > -0.05 && p.x < 1.05 && p.y > -0.05 && p.y < 1.05);
  return ok ? v.map((p) => ({ x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) })) : null;
}

/** Larguras anatômicas médias usadas como régua: dedo anelar (base) ≈ 18 mm; pulso ≈ 55 mm. */
export const ANATOMY_MM = { finger: 18, wrist: 55 };

export type Anchor = {
  target: Box;                       // caixa do ponto de aplicação (0–1000)
  center: { x: number; y: number };  // px
  widthPx: number;                   // largura do dedo/pulso no ponto de aplicação
  pxPerMm: number;                   // escala estimada da foto
  capsule: { x1: number; y1: number; x2: number; y2: number; r: number }; // px — região anatômica da joia
};

/**
 * Ancoragem anatômica: anel na falange proximal do anelar (entre 13 e 14, a ~38% da base);
 * pulseira logo acima do ponto do pulso (0), na direção do antebraço.
 */
export function anchorFromHand(lm: LM[], region: "hand" | "wrist", W: number, H: number): Anchor {
  const P = (i: number) => ({ x: lm[i].x * W, y: lm[i].y * H });
  const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  let center, widthPx, capsule, mm;
  if (region === "hand") {
    const m13 = P(13), p14 = P(14);
    widthPx = ((d(m13, P(9)) + d(m13, P(17))) / 2) * 0.92;
    center = lerp(m13, p14, 0.38);
    const a = lerp(m13, p14, 0.05), b = lerp(m13, p14, 0.72);
    capsule = { x1: a.x, y1: a.y, x2: b.x, y2: b.y, r: widthPx * 0.78 };
    mm = ANATOMY_MM.finger;
  } else {
    const w0 = P(0), m9 = P(9);
    widthPx = d(P(5), P(17)) * 0.82;
    center = { x: w0.x + (w0.x - m9.x) * 0.16, y: w0.y + (w0.y - m9.y) * 0.16 };
    const len = d(w0, m9) || 1, ux = (w0.x - m9.x) / len, uy = (w0.y - m9.y) / len, half = widthPx * 0.28;
    capsule = { x1: center.x - ux * half, y1: center.y - uy * half, x2: center.x + ux * half, y2: center.y + uy * half, r: widthPx * 0.72 };
    mm = ANATOMY_MM.wrist;
  }
  const half = widthPx * 0.75;
  const target = cleanBox([((center.y - half) / H) * 1000, ((center.x - half) / W) * 1000, ((center.y + half) / H) * 1000, ((center.x + half) / W) * 1000]) ?? [0, 0, 1000, 1000];
  return { target, center, widthPx, pxPerMm: widthPx / mm, capsule };
}
