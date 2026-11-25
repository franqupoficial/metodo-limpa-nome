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

/**
 * Brinco/pingente com a FOTOGRAFIA REAL da peça: a imagem (já aparada) é desenhada em escala real
 * e mesclada por multiplicação — o fundo branco de estúdio desaparece sobre a pele, sem recorte.
 */
export function drawPhoto(ctx: CanvasRenderingContext2D, pose: Pose, photo: HTMLCanvasElement, heightMm: number, metal: Metal, a: Adjust, kind: "earring" | "pendant") {
  const pxPerMm = pose.size / 140; // largura média do rosto na altura das orelhas ≈ 14 cm
  const hgt = Math.max(8, heightMm * pxPerMm * a.scale), wdt = (hgt * photo.width) / photo.height;
  ctx.save();
  ctx.translate(pose.x + a.dx, pose.y + a.dy);
  if (kind === "pendant") {
    // corrente fina contornando o pescoço até o pingente
    ctx.strokeStyle = SHADES[metal][1];
    ctx.lineWidth = Math.max(1, pose.size * 0.006 * a.scale);
    ctx.beginPath();
    ctx.moveTo(-pose.size * 0.42, -pose.size * 0.5);
    ctx.quadraticCurveTo(0, pose.size * 0.08, pose.size * 0.42, -pose.size * 0.5);
    ctx.stroke();
  }
  ctx.rotate((kind === "earring" ? 0 : pose.angle) + (a.rotate * Math.PI) / 180);
  ctx.globalCompositeOperation = "multiply";
  ctx.filter = `brightness(${a.light})`;
  ctx.drawImage(photo, -wdt / 2, kind === "pendant" ? -hgt * 0.04 : 0, wdt, hgt);
  ctx.restore();
}

/**
 * Apara o fundo branco de estúdio ao redor da joia (para escala correta). Fotos de par de brincos
 * (imagem bem mais larga que alta) usam só a metade esquerda — uma peça por orelha.
 */
export function trimPhoto(img: HTMLImageElement, single: boolean): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const bbox = (x0: number, x1: number) => {
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    for (let y = 0; y < c.height; y += 2) for (let x = x0; x < x1; x += 2) {
      const i = (y * c.width + x) * 4;
      if (Math.min(data[i], data[i + 1], data[i + 2]) < 232) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    return maxX < 0 ? { x: 0, y: 0, w: c.width, h: c.height } : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  };
  let b = bbox(0, c.width);
  if (single && b.w > b.h * 1.35) b = bbox(b.x, b.x + Math.floor(b.w / 2));
  const pad = 6, out = document.createElement("canvas");
  out.width = b.w + pad * 2; out.height = b.h + pad * 2;
  const o = out.getContext("2d")!;
  o.fillStyle = "#fff"; o.fillRect(0, 0, out.width, out.height);
  o.drawImage(c, b.x, b.y, b.w, b.h, pad, pad, b.w, b.h);
  return out;
}
