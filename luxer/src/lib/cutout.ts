import "server-only";
import sharp from "sharp";
import { prisma } from "./db";
import { getObject, putObject } from "./storage";
import { mediaUrl } from "./media-url";

/**
 * Recorte automático das fotos de estúdio (fundo claro) para exibir a joia "flutuando" sobre fundos escuros.
 * Algoritmo: estima a cor do fundo pelas bordas, faz preenchimento (flood fill) a partir das bordas apenas
 * sobre pixels próximos dessa cor — assim pedras brancas no interior da peça são preservadas —, suaviza a
 * máscara e remove o halo claro das bordas (desmultiplicação pela cor de fundo). Resultado cacheado no storage.
 */
export async function makeCutout(input: Buffer, size = 900): Promise<Buffer> {
  const { data, info } = await sharp(input).rotate().flatten({ background: "#ffffff" }).resize({ width: size, height: size, fit: "inside", withoutEnlargement: true }).toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`canais inesperados: ${info.channels}`);
  const W = info.width, H = info.height, N = W * H;
  // cor de fundo: mediana dos pixels da borda
  const border: number[][] = [];
  for (let x = 0; x < W; x += 2) { border.push(px(data, x, 0, W)); border.push(px(data, x, H - 1, W)); }
  for (let y = 0; y < H; y += 2) { border.push(px(data, 0, y, W)); border.push(px(data, W - 1, y, W)); }
  const med = (i: number) => border.map((p) => p[i]).sort((a, b) => a - b)[border.length >> 1];
  const bg = [med(0), med(1), med(2)];
  const tol = 34, tol2 = tol * tol;
  const isBg = new Uint8Array(N);
  const stack: number[] = [];
  const near = (i: number) => {
    const o = i * 4;
    const dr = data[o] - bg[0], dg = data[o + 1] - bg[1], db = data[o + 2] - bg[2];
    return dr * dr + dg * dg + db * db < tol2;
  };
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop()!;
    if (isBg[i] || !near(i)) continue;
    isBg[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
  // buracos internos (dentro do aro, dos elos, da argola): regiões uniformes da cor do fundo e grandes o bastante.
  // Pedras brancas são pequenas e facetadas (sem uniformidade), então permanecem.
  const tolIn = 11, tolIn2 = tolIn * tolIn, minArea = Math.max(220, Math.round(N * 0.0004));
  const nearIn = (i: number) => {
    const o = i * 4;
    const dr = data[o] - bg[0], dg = data[o + 1] - bg[1], db = data[o + 2] - bg[2];
    return dr * dr + dg * dg + db * db < tolIn2;
  };
  const seen = new Uint8Array(N);
  for (let i0 = 0; i0 < N; i0++) {
    if (isBg[i0] || seen[i0] || !nearIn(i0)) continue;
    const comp: number[] = [];
    const st = [i0];
    seen[i0] = 1;
    while (st.length) {
      const i = st.pop()!;
      comp.push(i);
      const x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && !seen[j] && !isBg[j] && nearIn(j)) { seen[j] = 1; st.push(j); }
      }
    }
    if (comp.length >= minArea) for (const i of comp) isBg[i] = 1;
  }
  // máscara suavizada (anti-serrilhado nas bordas)
  const mask = Buffer.alloc(N);
  for (let i = 0; i < N; i++) mask[i] = isBg[i] ? 0 : 255;
  const blurred = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).blur(1.1).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  const soft = blurred.data;
  if (blurred.info.channels !== 1 || soft.length !== N) throw new Error("máscara inválida");
  const out = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const a = soft[i] / 255, o = i * 4;
    if (a <= 0.02) { out[o + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) {
      // remove o halo do fundo claro nas bordas semitransparentes
      const v = a < 0.98 ? (data[o + c] - (1 - a) * bg[c]) / a : data[o + c];
      out[o + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
    out[o + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).webp({ quality: 90, alphaQuality: 90 }).toBuffer();
}

function px(d: Buffer, x: number, y: number, W: number) {
  const o = (y * W + x) * 4;
  return [d[o], d[o + 1], d[o + 2]];
}

/** URL do recorte de uma imagem de produto (gera e grava na primeira vez). */
export async function cutoutUrl(imageId: string): Promise<string | null> {
  const img = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!img) return null;
  if (img.cutoutKey) return mediaUrl(img.cutoutKey);
  const src = await getObject(img.key);
  if (!src) return null;
  try {
    const buf = await makeCutout(src.body);
    const key = await putObject(img.key.replace(/\.webp$/, "") + "-cutout-v2.webp", buf, "image/webp");
    await prisma.productImage.update({ where: { id: img.id }, data: { cutoutKey: key } });
    return mediaUrl(key);
  } catch (e) {
    console.error("[cutout]", e);
    return mediaUrl(img.key);
  }
}
