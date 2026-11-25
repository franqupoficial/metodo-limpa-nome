/**
 * Valida a extração de alfa do provador AR em TODAS as fotografias do catálogo:
 *   npx tsx scripts/validate-matte.ts [pasta-de-saída-para-amostras]
 * Usa exatamente o código do navegador (src/components/luxe/ar/matte.ts).
 * Falha = sobra de fundo opaco colado à transparência (halo) acima de 0,5% da peça, branco liso
 *         preso na peça acima de 3%,
 *         ou nenhuma peça encontrada.
 */
import sharp from "sharp";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { matteWhite, matteResidue } from "../src/components/luxe/ar/matte";

const ROOT = "storage/media/catalog";
const out = process.argv[2];
const files = readdirSync(ROOT).flatMap((d) => statSync(path.join(ROOT, d)).isDirectory() ? readdirSync(path.join(ROOT, d)).filter((f) => /^\d+\.webp$/.test(f)).map((f) => path.join(ROOT, d, f)) : []);
type Row = { file: string; pieces: number; haloPct: number; flatPct: number; borderOpaque: number; opaque: number };
const rows: Row[] = [];
(async () => {
  for (const f of files) {
    const { data, info } = await sharp(f).flatten({ background: "#ffffff" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const r = matteWhite(data, info.width, info.height);
    const res = matteResidue(data, info.width, info.height, r.bg);
    rows.push({ file: f, pieces: r.pieces.length, haloPct: res.opaque ? (res.halo / res.opaque) * 100 : 100, flatPct: res.opaque ? (res.flatWhite / res.opaque) * 100 : 100, borderOpaque: res.borderOpaque, opaque: res.opaque });
    if (out && (rows.length % 97 === 0 || res.halo / Math.max(1, res.opaque) > 0.005 || res.flatWhite / Math.max(1, res.opaque) > 0.03)) {
      // amostra composta sobre tom de pele escuro e sobre preto, para inspeção visual
      const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).resize(240, 240, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      const tag = f.replace(/[\/]/g, "_");
      await sharp({ create: { width: 480, height: 240, channels: 3, background: "#2a1a12" } }).composite([{ input: png, left: 0, top: 0 }, { input: await sharp({ create: { width: 240, height: 240, channels: 3, background: "#c69c80" } }).png().toBuffer(), left: 240, top: 0 }, { input: png, left: 240, top: 0 }]).png().toFile(path.join(out, `${tag}.png`));
    }
  }
  const fail = rows.filter((r) => r.haloPct > 0.5 || r.flatPct > 3 || r.pieces === 0);
  const touchingEdge = rows.filter((r) => r.borderOpaque > 0);
  const summary = { fotos: rows.length, aprovadas: rows.length - fail.length, reprovadas: fail.length, haloMedioPct: +(rows.reduce((a, r) => a + r.haloPct, 0) / rows.length).toFixed(4), pecaEncostaNaBorda: touchingEdge.length, comVariasPecas: rows.filter((r) => r.pieces > 1).length, branchoLisoMedioPct: +(rows.reduce((a, r) => a + r.flatPct, 0) / rows.length).toFixed(3), piores: [...rows].sort((a, b) => b.flatPct + b.haloPct * 5 - (a.flatPct + a.haloPct * 5)).slice(0, 10).map((r) => `${r.file} halo ${r.haloPct.toFixed(3)}% branco liso ${r.flatPct.toFixed(2)}%`) };
  console.log(JSON.stringify(summary, null, 2));
  if (out) writeFileSync(path.join(out, "relatorio.json"), JSON.stringify({ summary, fail }, null, 2));
  process.exit(fail.length ? 1 : 0);
})();
