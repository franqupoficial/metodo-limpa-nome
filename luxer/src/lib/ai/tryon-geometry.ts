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
