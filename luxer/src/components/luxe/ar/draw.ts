"use client";
import type { Pose } from "./pose";
import type { Metal } from "../three/metals";

/** Tons de cada liga para o sombreamento metálico (borda escura → reflexo → borda escura). */
const SHADES: Record<Metal, [string, string, string, string]> = {
  amarelo: ["#6e4d14", "#c99a3e", "#ffe7a6", "#fff8e0"],
  branco: ["#6f747b", "#b9bec6", "#eef0f3", "#ffffff"],
  rose: ["#7a4434", "#c98b74", "#f6cdbd", "#fff1ea"],
};

export type Adjust = { scale: number; rotate: number; light: number; dx: number; dy: number };

/**
 * Aro (anel ou pulseira) visto de cima: faixa que cruza o dedo/pulso com bordas curvas (cilindro em perspectiva),
 * sombreamento metálico e sombra de contato. Com pedra, desenha cravação de 4 garras e diamante facetado.
 */
/** Cor da pedra pelo cadastro da peça (nome/tipo de pedra); null = sem pedra. */
export type Stone = { kind: "facet" | "pearl"; hi: string; mid: string; lo: string } | null;
export function stoneFor(text: string): Stone {
  const t = text.toLowerCase();
  if (/p[ée]rola/.test(t)) return { kind: "pearl", hi: "#ffffff", mid: "#f3ece2", lo: "#cdbfae" };
  if (/ametista/.test(t)) return { kind: "facet", hi: "#f0d4ff", mid: "#9b4fd1", lo: "#4b1c70" };
  if (/safira/.test(t)) return { kind: "facet", hi: "#d4e4ff", mid: "#2e5bd1", lo: "#132a6b" };
  if (/esmeralda/.test(t)) return { kind: "facet", hi: "#d3ffe8", mid: "#1f9a5a", lo: "#0b4a2a" };
  if (/rubi/.test(t)) return { kind: "facet", hi: "#ffd3db", mid: "#c81d3a", lo: "#5e0a18" };
  if (/solit|brilhante|diamante|zirc|pedra|cristal/.test(t)) return { kind: "facet", hi: "#ffffff", mid: "#e6ebf2", lo: "#7d8796" };
  return null;
}

export function drawBand(ctx: CanvasRenderingContext2D, pose: Pose, metal: Metal, a: Adjust, kind: "ring" | "bracelet", stone: Stone) {
  const s = pose.size * a.scale;
  const bw = s * (kind === "ring" ? 0.27 : 0.11), L = s * (kind === "ring" ? 0.5 : 0.56), c = bw * 0.95;
  const [d, m, h, w] = SHADES[metal];
  ctx.save();
  ctx.translate(pose.x + a.dx, pose.y + a.dy);
  ctx.rotate(pose.angle + (a.rotate * Math.PI) / 180);
  ctx.filter = `brightness(${a.light})`;
  const band = new Path2D();
  band.moveTo(-bw / 2, -L);
  band.quadraticCurveTo(-bw / 2 + c, 0, -bw / 2, L);
  band.lineTo(bw / 2, L);
  band.quadraticCurveTo(bw / 2 + c, 0, bw / 2, -L);
  band.closePath();
  // sombra de contato na pele
  ctx.shadowColor = "rgba(0,0,0,0.38)";
  ctx.shadowBlur = s * 0.07;
  ctx.shadowOffsetX = s * 0.03;
  const g = ctx.createLinearGradient(0, -L, 0, L);
  g.addColorStop(0, d); g.addColorStop(0.16, m); g.addColorStop(0.36, h); g.addColorStop(0.46, w); g.addColorStop(0.62, m); g.addColorStop(0.86, d); g.addColorStop(1, d);
  ctx.fillStyle = g;
  ctx.fill(band);
  ctx.shadowColor = "transparent";
  // bisel: brilho fino na borda e escurecimento na outra
  const bevel = ctx.createLinearGradient(-bw / 2, 0, bw / 2 + c, 0);
  bevel.addColorStop(0, "rgba(255,255,255,0.35)"); bevel.addColorStop(0.25, "rgba(255,255,255,0)"); bevel.addColorStop(0.8, "rgba(0,0,0,0)"); bevel.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = bevel;
  ctx.fill(band);
  if (stone) {
    const r = s * 0.24, cx = c * 0.55, cy = 0;
    ctx.fillStyle = m;
    for (const k of [0, 1, 2, 3]) { const ang = Math.PI / 4 + (k * Math.PI) / 2; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * r * 0.92, cy + Math.sin(ang) * r * 0.92, r * 0.16, 0, Math.PI * 2); ctx.fill(); }
    if (stone.kind === "pearl") {
      const pg = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.05, cx, cy, r);
      pg.addColorStop(0, stone.hi); pg.addColorStop(0.55, stone.mid); pg.addColorStop(1, stone.lo);
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    const dia = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r);
    dia.addColorStop(0, "#ffffff"); dia.addColorStop(0.3, stone.hi); dia.addColorStop(0.7, stone.mid); dia.addColorStop(1, stone.lo);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const ang = (k * Math.PI) / 4 + Math.PI / 8; ctx[k ? "lineTo" : "moveTo"](cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); }
    ctx.closePath();
    ctx.fillStyle = dia;
    ctx.fill();
    // facetas e mesa
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = Math.max(0.6, r * 0.04);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const ang = (k * Math.PI) / 4 + Math.PI / 8; ctx.moveTo(cx + Math.cos(ang) * r * 0.5, cy + Math.sin(ang) * r * 0.5); ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); }
    ctx.stroke();
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const ang = (k * Math.PI) / 4; ctx[k ? "lineTo" : "moveTo"](cx + Math.cos(ang) * r * 0.5, cy + Math.sin(ang) * r * 0.5); }
    ctx.closePath();
    ctx.stroke();
    // brilho
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath(); ctx.arc(cx - r * 0.32, cy - r * 0.3, r * 0.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

import { matteWhite, labelPieces, keypointFor, maskAgrees, refineWithMask, suspectPoint, suspectMaskAgrees, type Piece } from "./matte";

/** Uma peça isolada da fotografia do catálogo, com canal alfa real (fundo removido). */
export type PieceImg = {
  canvas: HTMLCanvasElement; thumb: string; aspect: number; cx: number; area: number;
  /** compacta = pingente/brinco/anel; alongada ou rala = corrente/colar estendido (não se "veste" como foto) */
  compact: boolean;
};

/** Par de brincos: as duas peças mais parecidas (área e proporção). */
export function findPair(ps: PieceImg[]): [number, number] | null {
  let best: [number, number] | null = null, score = Infinity;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const ar = Math.min(ps[i].area, ps[j].area) / Math.max(ps[i].area, ps[j].area), as = Math.abs(ps[i].aspect - ps[j].aspect);
    if (ar < 0.7 || as > 0.3 || !ps[i].compact || !ps[j].compact) continue;
    const sc = (1 - ar) + as;
    if (sc < score) { score = sc; best = [i, j]; }
  }
  return best;
}

/**
 * Prepara as peças da foto do catálogo: extração de alfa (fundo branco → transparente, bordas suavizadas
 * e descontaminadas) e separação por componente — cada brinco do par, o colar e os brincos de um conjunto.
 */
function photoCanvas(img: HTMLImageElement, maxSide: number) {
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); // PNG com transparência vira fundo branco antes da extração
  ctx.drawImage(img, 0, 0, w, h);
  return { c, w, h, id: ctx.getImageData(0, 0, w, h) };
}

export function preparePieces(img: HTMLImageElement, pearl = false, maxSide = 900): PieceImg[] {
  const { w, h, id } = photoCanvas(img, maxSide);
  const r = matteWhite(id.data, w, h, { pearl });
  return cutPieces(id.data, w, h, r.pieces, r.labels);
}

/** Segmentador por ponto (IA no aparelho): devolve a máscara de confiança (w×h, 0–1) do objeto sob o ponto. */
export type SegmentFn = (src: HTMLCanvasElement, point: { x: number; y: number }) => Promise<Float32Array | null>;

/**
 * Versão refinada para joias claras (pérolas) em fundo branco: a extração por cor e, por cima, a máscara do
 * segmentador para cada peça (só aceita se coerente com a peça). Devolve null se nada mudou.
 */
export async function refinePieces(img: HTMLImageElement, segment: SegmentFn, maxSide = 900): Promise<PieceImg[] | null> {
  const { c, w, h, id } = photoCanvas(img, maxSide);
  const orig = new Uint8ClampedArray(id.data);
  const r = matteWhite(id.data, w, h, { pearl: true });
  let changed = 0;
  for (const [idx, p] of r.pieces.slice(0, 6).entries()) {
    const mask = await segment(c, keypointFor(id.data, r.labels, idx, p, w, h));
    if (mask && mask.length === w * h && maskAgrees(mask, id.data, r.labels, idx, p, w)) changed += refineWithMask(id.data, orig, r.bg, mask, p, w);
    // 2º clique: pérola que a cor apagou inteira, colada à peça (ex.: a pérola do brinco "anzol")
    const sp = suspectPoint(orig, id.data, r.bg, p, w, h);
    if (!sp) continue;
    const m2 = await segment(c, sp);
    if (m2 && m2.length === w * h && suspectMaskAgrees(m2, orig, r.bg, r.labels, idx, p, w)) changed += refineWithMask(id.data, orig, r.bg, m2, p, w);
  }
  if (!changed) return null;
  const again = labelPieces(id.data, w, h);
  return cutPieces(id.data, w, h, again.pieces, again.labels);
}

function cutPieces(data: Uint8ClampedArray, w: number, _h: number, pieces: Piece[], labels: Int32Array): PieceImg[] {
  return pieces.slice(0, 6).map((p, idx) => {
    const pad = 4, out = document.createElement("canvas");
    out.width = p.w + pad * 2; out.height = p.h + pad * 2;
    const o = out.getContext("2d")!;
    const part = o.createImageData(out.width, out.height);
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const si = (p.y + y) * w + (p.x + x);
      const lab = labels[si];
      // pixels da própria peça (e da faixa suave de borda vizinha a ela); outras peças ficam de fora
      if (lab !== idx && !(lab === -1 && data[si * 4 + 3] > 0)) continue;
      const di = ((y + pad) * out.width + (x + pad)) * 4;
      part.data[di] = data[si * 4]; part.data[di + 1] = data[si * 4 + 1]; part.data[di + 2] = data[si * 4 + 2]; part.data[di + 3] = data[si * 4 + 3];
    }
    o.putImageData(part, 0, 0);
    const t = document.createElement("canvas"), ts = 96, tk = Math.min(ts / out.width, ts / out.height);
    t.width = ts; t.height = ts;
    t.getContext("2d")!.drawImage(out, (ts - out.width * tk) / 2, (ts - out.height * tk) / 2, out.width * tk, out.height * tk);
    const elong = Math.max(p.w, p.h) / Math.max(1, Math.min(p.w, p.h)), fill = p.area / (p.w * p.h);
    return { canvas: out, thumb: t.toDataURL("image/png"), aspect: out.height / out.width, cx: p.cx, area: p.area, compact: elong <= 2.6 && fill >= 0.16 };
  });
}

/** Filtro de integração: luz da cena (automática) × ajuste manual, com leve contraste. */
const look = (light: number) => `brightness(${light.toFixed(3)}) contrast(1.05) saturate(1.04)`;

/**
 * Desenha uma peça com alfa real, ancorada pelo topo (brinco de gota, pingente) ou pelo centro (brinco de pressão),
 * com sombra de contato sutil. `mirror` espelha a peça (o outro brinco do par).
 */
export function drawPiece(ctx: CanvasRenderingContext2D, piece: PieceImg, x: number, y: number, heightPx: number, angle: number, light: number, anchor: "top" | "center", mirror = false) {
  const h = Math.max(6, heightPx), w = h / piece.aspect;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (mirror) ctx.scale(-1, 1);
  ctx.filter = look(light);
  ctx.shadowColor = "rgba(0,0,0,0.32)";
  ctx.shadowBlur = h * 0.08;
  ctx.shadowOffsetY = h * 0.035;
  ctx.drawImage(piece.canvas, -w / 2, anchor === "top" ? -h * 0.04 : -h / 2, w, h);
  ctx.restore();
}

/** Corrente fina contornando o pescoço até o ponto de apoio do pingente, no tom do metal da peça. */
export function drawChain(ctx: CanvasRenderingContext2D, pose: Pose, metal: Metal, widthPx: number, light: number, dropPx: number) {
  const [d, m, h] = SHADES[metal];
  const s = pose.size;
  // trajeto da corrente no colo: duas cúbicas (lado esquerdo e direito) amostradas em pontos
  const P = [[-s * 0.46, -s * 0.62], [-s * 0.36, -s * 0.05], [-s * 0.12, dropPx * 0.9], [0, dropPx], [s * 0.12, dropPx * 0.9], [s * 0.36, -s * 0.05], [s * 0.46, -s * 0.62]];
  const cub = (o: number, t: number) => [0, 1].map((k) => (1 - t) ** 3 * P[o][k] + 3 * (1 - t) ** 2 * t * P[o + 1][k] + 3 * (1 - t) * t ** 2 * P[o + 2][k] + t ** 3 * P[o + 3][k]);
  const pts: number[][] = [];
  for (const o of [0, 3]) for (let i = 0; i <= 120; i++) pts.push(cub(o, i / 120));
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  ctx.filter = look(light);
  // sombra de contato suave na pele (não um contorno duro)
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + widthPx * 0.6) : ctx.moveTo(x, y + widthPx * 0.6)));
  ctx.strokeStyle = "rgba(40,22,10,0.1)"; ctx.lineWidth = widthPx * 0.8; ctx.lineCap = "round";
  ctx.shadowColor = "rgba(40,22,10,0.25)"; ctx.shadowBlur = widthPx * 1.2; ctx.stroke();
  ctx.shadowColor = "transparent";
  // elos: argolas ovais alternando de frente e de perfil ao longo do trajeto (corrente "cadeado"/cartier)
  const link = Math.max(2.2, widthPx * 1.5);
  let acc = 0, k = 0;
  const g = ctx.createLinearGradient(0, -s * 0.6, 0, dropPx);
  g.addColorStop(0, d); g.addColorStop(0.45, m); g.addColorStop(0.7, h); g.addColorStop(1, m);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    acc += Math.hypot(x1 - x0, y1 - y0);
    if (acc < link * 0.82) continue;
    acc = 0; k++;
    const ang = Math.atan2(y1 - y0, x1 - x0), flat = k % 2 === 0;
    ctx.save();
    ctx.translate(x1, y1); ctx.rotate(ang);
    ctx.beginPath();
    ctx.ellipse(0, 0, link * 0.62, flat ? widthPx * 0.5 : widthPx * 0.16, 0, 0, Math.PI * 2);
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(0.8, widthPx * 0.26); ctx.stroke();
    if (flat) { ctx.beginPath(); ctx.ellipse(0, 0, link * 0.62, widthPx * 0.5, 0, Math.PI * 1.15, Math.PI * 1.6); ctx.strokeStyle = h; ctx.lineWidth = Math.max(0.5, widthPx * 0.1); ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  ctx.restore();
}
