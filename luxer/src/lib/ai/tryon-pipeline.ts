import "server-only";
import sharp from "sharp";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { getSettings } from "../settings";
import { getObject } from "../storage";
import { encryptBuffer, decryptBuffer } from "../crypto";
import { notify } from "../notifications";
import { REGION_OF, type BodyRegion } from "./categories";
import { analyze, generateImage, TryOnError, type ImagePart } from "./tryon";
import { cleanBox, cropRect, blendEllipse, centerAspect, fidelityScore, toRect, type Box, type Rect } from "./tryon-geometry";

/**
 * LUXER AI TRY-ON — pipeline de processamento.
 *
 *  1. detect    visão computacional (Gemini) localiza a região do corpo e o ponto exato de aplicação
 *               (falange do dedo, lóbulo, base do pescoço/colo, pulso) e avalia a foto; foto inadequada
 *               é recusada aqui, sem custo de geração.
 *  2. profile   perfil técnico da joia extraído das fotografias cadastradas (cache no produto).
 *  3. generate  edição generativa SOMENTE do recorte da região, com as fotografias originais da peça
 *               como referência obrigatória e instruções específicas da categoria.
 *  4. composite o recorte editado volta para a foto original por uma máscara elíptica suavizada:
 *               fora da região de aplicação, a foto do cliente permanece idêntica (pixel a pixel).
 *  5. verify    verificação independente compara a peça aplicada com as fotografias da peça;
 *               abaixo da nota mínima, gera de novo com as divergências apontadas; se persistir,
 *               o resultado é descartado (nunca entregamos outra joia "parecida").
 */

type Detection = {
  found: boolean; region_box: number[]; target_box: number[]; people_count: number;
  target_visibility: "clear" | "partial" | "hidden"; lighting: "good" | "dark" | "overexposed"; sharp: boolean;
  wearing_jewelry_on_target: boolean; both_ears_visible?: boolean; guidance_pt: string;
};
type Profile = { type: string; metal_colors: string[]; stones: { color: string; shape: string; count: string; setting: string }[]; key_features: string[]; proportions: string };
type Verdict = { jewelry_present: boolean; placed_on_target: boolean; same_design_score: number; metal_color_match: boolean; stones_match: boolean; scale_plausible: boolean; person_unchanged: boolean; issues_pt: string; issues_en: string };

const TARGET: Record<BodyRegion, { region: string; target: string; reject: string }> = {
  hand: {
    region: "the whole visible hand (fingers included)",
    target: "the base segment (proximal phalanx) of the ring finger, between the knuckle and the palm — where a ring is worn. If the ring finger is hidden, use the most visible finger",
    reject: "Não encontramos uma mão com os dedos visíveis. Fotografe a mão aberta, de frente, com boa luz.",
  },
  ear: {
    region: "the side of the head that contains the most visible ear",
    target: "the earlobe of the most visible ear, where an earring is worn",
    reject: "Não encontramos a orelha. Prenda o cabelo e fotografe o rosto de lado ou levemente virado, com a orelha visível.",
  },
  neck: {
    region: "the area from the chin down to the upper chest",
    target: "the base of the neck and the collarbone line, where a necklace rests",
    reject: "Não encontramos o pescoço e o colo. Fotografe de frente, do queixo até o peito, sem cabelo ou roupa cobrindo o pescoço.",
  },
  wrist: {
    region: "the hand and the forearm",
    target: "the wrist joint, between the hand and the forearm, where a bracelet is worn",
    reject: "Não encontramos o pulso. Fotografe a mão e o antebraço, com o pulso livre de mangas e relógio.",
  },
};

const box4 = { type: "ARRAY", items: { type: "INTEGER" }, minItems: 4, maxItems: 4 };
const DETECT_SCHEMA = {
  type: "OBJECT",
  properties: {
    found: { type: "BOOLEAN" }, region_box: box4, target_box: box4, people_count: { type: "INTEGER" },
    target_visibility: { type: "STRING", enum: ["clear", "partial", "hidden"] }, lighting: { type: "STRING", enum: ["good", "dark", "overexposed"] },
    sharp: { type: "BOOLEAN" }, wearing_jewelry_on_target: { type: "BOOLEAN" }, both_ears_visible: { type: "BOOLEAN" }, guidance_pt: { type: "STRING" },
  },
  required: ["found", "region_box", "target_box", "people_count", "target_visibility", "lighting", "sharp", "wearing_jewelry_on_target", "guidance_pt"],
};
const PROFILE_SCHEMA = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING" }, metal_colors: { type: "ARRAY", items: { type: "STRING" } },
    stones: { type: "ARRAY", items: { type: "OBJECT", properties: { color: { type: "STRING" }, shape: { type: "STRING" }, count: { type: "STRING" }, setting: { type: "STRING" } }, required: ["color", "shape", "count", "setting"] } },
    key_features: { type: "ARRAY", items: { type: "STRING" } }, proportions: { type: "STRING" },
  },
  required: ["type", "metal_colors", "stones", "key_features", "proportions"],
};
const VERIFY_SCHEMA = {
  type: "OBJECT",
  properties: {
    jewelry_present: { type: "BOOLEAN" }, placed_on_target: { type: "BOOLEAN" }, same_design_score: { type: "INTEGER" }, metal_color_match: { type: "BOOLEAN" },
    stones_match: { type: "BOOLEAN" }, scale_plausible: { type: "BOOLEAN" }, person_unchanged: { type: "BOOLEAN" }, issues_pt: { type: "STRING" }, issues_en: { type: "STRING" },
  },
  required: ["jewelry_present", "placed_on_target", "same_design_score", "metal_color_match", "stones_match", "scale_plausible", "person_unchanged", "issues_pt", "issues_en"],
};

const detectPrompt = (r: BodyRegion) => `TASK: DETECT_REGION (${r})
You are the body-region detector of a fine-jewelry virtual try-on.
Look at the photo and locate:
- region_box: ${TARGET[r].region};
- target_box: ${TARGET[r].target}.
Boxes use [ymin, xmin, ymax, xmax] normalized to 0-1000. Make target_box tight.
Also report: how many people are visible, whether the target is clearly visible, the lighting, whether the photo is sharp, and whether jewelry is already worn on the target.${r === "ear" ? " Also report whether both ears are visible." : ""}
If the photo is unsuitable, set found=false and write guidance_pt: one short instruction in Brazilian Portuguese telling the customer how to take a better photo.`;

const profilePrompt = (catalog: string) => `TASK: JEWEL_PROFILE
The images are studio photos of ONE real piece of fine jewelry sold by the store (different angles). Describe exactly what is visible — never guess hidden parts:
type of piece, metal colors, every stone (color, cut/shape, approximate count, setting), the distinctive design features someone must reproduce to keep it the SAME piece (shape of the band/links/pendant, patterns, textures, engravings, finishes), and its proportions.
Catalog data from the store: ${catalog}`;

function profileText(p: Profile) {
  const stones = p.stones.length ? p.stones.map((s) => `${s.count} ${s.color} ${s.shape} stone(s), ${s.setting} setting`).join("; ") : "no stones";
  return `Piece: ${p.type}. Metal: ${p.metal_colors.join(", ")}. Stones: ${stones}. Distinctive features: ${p.key_features.join("; ")}. Proportions: ${p.proportions}.`;
}

/** Instruções específicas de cada categoria (posição, escala, física da peça). */
function placement(category: string, d: Detection, dims: string) {
  switch (category) {
    case "aneis": return `Put the ring on the finger at the marked target (base segment of the finger). The band wraps around the finger following its curvature and perspective; the part behind the finger is hidden. The stone/top faces outward the way the finger is oriented. A ring band is about as wide as described${dims}; a finger is about 16-20 mm wide — keep that real scale.`;
    case "brincos": return `Attach the earring(s) to the earlobe${d.both_ears_visible ? "s — both ears are visible, so place a matching pair, mirrored" : ""}. Stud earrings sit flat on the lobe; drop earrings hang straight down by gravity from the lobe. Real scale${dims}; an earlobe is about 15-20 mm tall.`;
    case "pingentes": return `Place the pendant hanging from a fine gold chain around the neck, the pendant resting at the center of the chest below the collarbone, following gravity and the body's curvature. Reproduce the pendant exactly; the chain must be simple and thin unless the reference shows one. Real scale${dims}.`;
    case "colares":
    case "correntes": return `Place the necklace around the neck, draping by gravity over the collarbone and chest, following skin and clothing contours, going behind the neck where hidden. Reproduce the exact link pattern and thickness from the references. Real scale${dims}.`;
    case "pulseiras": return `Place the bracelet around the wrist, wrapping around it with correct perspective (the far side hidden), resting by gravity near the wrist bone. Reproduce the exact links/shape from the references. Real scale${dims}; a wrist is about 50-60 mm wide.`;
    default: return "Place the jewelry where it is naturally worn.";
  }
}

const generatePrompt = (category: string, d: Detection, profile: Profile, dims: string, feedback?: string) => `TASK: TRY_ON_EDIT
Image 1 is a close-up crop of a customer's real photo. The remaining images are the store's photos of ONE real piece of fine jewelry — they are the mandatory reference.
Edit image 1 so the customer is wearing EXACTLY that piece.
${placement(category, d, dims)}
Reference profile (must match): ${profileText(profile)}
Strict rules:
- Reproduce the very same piece: same design, shape, metal color, number/color/cut of stones, links, texture and finish. Do not redesign, simplify, embellish, or substitute a similar piece.
- Edit only where the jewelry goes. Keep everything else identical: skin, fingers/ear/neck shape, nails, hair, clothing, background, framing, crop and image size.${d.wearing_jewelry_on_target ? " Remove any jewelry the person already wears at that exact spot." : ""}
- Match the photo's lighting direction, color temperature, reflections, contact shadows and depth of field so it looks photographed, not pasted.
- Output one photorealistic image with the same framing as image 1.${feedback ? `\nA previous attempt was rejected for these reasons — fix them: ${feedback}` : ""}`;

const verifyPrompt = (category: string, profile: Profile) => `TASK: VERIFY_FIDELITY
You are the quality inspector of a fine-jewelry virtual try-on (category: ${category}).
Image 1: the customer's photo BEFORE editing (crop). Image 2: the same crop AFTER the try-on edit. Remaining images: the store's reference photos of the real piece.
Expected piece: ${profileText(profile)}
Judge strictly:
- jewelry_present: is a piece of jewelry visible in image 2 at the expected body spot?
- placed_on_target: is it worn correctly and physically plausible (on the finger/earlobe/neck/wrist)?
- same_design_score (0-100): is it the SAME piece as the references (shape, design, stones, details)? A similar-but-different piece scores below 50.
- metal_color_match, stones_match, scale_plausible (realistic size on the body).
- person_unchanged: apart from the jewelry, is the person (skin, anatomy, face, hair, clothes) and background the same as image 1?
Write issues_pt (Portuguese, for the store team) and issues_en (English, concrete corrections) — empty strings if none.`;

const MAX_SIDE = 1600;

async function setStage(id: string, stage: string, extra: Prisma.TryOnRequestUpdateInput = {}) {
  await prisma.tryOnRequest.update({ where: { id }, data: { stage, ...extra } });
}

async function productReferences(productId: string): Promise<{ images: ImagePart[]; firstKey: string }> {
  const imgs = await prisma.productImage.findMany({ where: { productId }, orderBy: { position: "asc" }, take: 3 });
  const out: ImagePart[] = [];
  for (const i of imgs) {
    const o = await getObject(i.key);
    if (o) out.push({ data: await sharp(o.body).flatten({ background: "#ffffff" }).resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer(), mime: "image/jpeg" });
  }
  if (!out.length) throw new TryOnError("no_reference", "Fotografia da peça indisponível no armazenamento.");
  return { images: out, firstKey: imgs[0].key };
}

/** Máscara elíptica com borda suavizada (alfa) para mesclar o recorte gerado à foto original. */
async function ellipseMask(w: number, h: number, e: { cx: number; cy: number; rx: number; ry: number; feather: number }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${e.feather}"/></filter></defs><rect width="100%" height="100%" fill="black"/><ellipse cx="${e.cx}" cy="${e.cy}" rx="${Math.max(4, e.rx - e.feather)}" ry="${Math.max(4, e.ry - e.feather)}" fill="white" filter="url(#f)"/></svg>`;
  return sharp(Buffer.from(svg)).extractChannel(0).raw().toBuffer();
}
async function borderMask(w: number, h: number, feather: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><filter id="f"><feGaussianBlur stdDeviation="${feather / 2}"/></filter></defs><rect width="100%" height="100%" fill="black"/><rect x="${feather}" y="${feather}" width="${w - 2 * feather}" height="${h - 2 * feather}" fill="white" filter="url(#f)"/></svg>`;
  return sharp(Buffer.from(svg)).extractChannel(0).raw().toBuffer();
}

/** Diferença média (0–255) entre duas imagens do mesmo tamanho, fora da elipse de aplicação. */
async function driftOutside(a: Buffer, b: Buffer, w: number, h: number, e: { cx: number; cy: number; rx: number; ry: number }) {
  const S = 96;
  const [ga, gb] = await Promise.all([a, b].map((x) => sharp(x).resize(S, S, { fit: "fill" }).greyscale().raw().toBuffer()));
  let sum = 0, n = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const px = ((x + 0.5) / S) * w, py = ((y + 0.5) / S) * h;
    if (((px - e.cx) / (e.rx * 1.2)) ** 2 + ((py - e.cy) / (e.ry * 1.2)) ** 2 <= 1) continue;
    sum += Math.abs(ga[y * S + x] - gb[y * S + x]); n++;
  }
  return n ? sum / n : 0;
}

export async function runTryOn(id: string) {
  const t0 = Date.now();
  const metrics: Record<string, number | string> = {};
  const s = (await getSettings()).ai;
  let cost = 0;
  const lap = (k: string, t: number) => { metrics[k] = Date.now() - t; };
  const req = await prisma.tryOnRequest.findUnique({ where: { id }, include: { product: true, assets: { where: { kind: "INPUT" } } } });
  if (!req || req.status !== "QUEUED") return;
  await prisma.tryOnRequest.update({ where: { id }, data: { status: "PROCESSING", stage: "detect" } });
  try {
    if (!req.product || !req.assets[0]) throw new TryOnError("input_missing", "Foto ou peça indisponível para processamento.");
    const region = REGION_OF[req.category];
    if (!region) throw new TryOnError("category", `Categoria sem pipeline: ${req.category}`);
    const photo = decryptBuffer(Buffer.from(req.assets[0].data));
    const meta = await sharp(photo).metadata();
    const W = meta.width!, H = meta.height!;
    const person: ImagePart = { data: photo, mime: "image/jpeg" };

    // 1. detecção da região do corpo
    let t = Date.now();
    const det = await analyze<Detection>(s.analysisModel, detectPrompt(region), [person], DETECT_SCHEMA);
    cost += s.analysisCostCents; lap("detectMs", t);
    const target = cleanBox(det.target_box);
    const regionBox = cleanBox(det.region_box);
    await setStage(id, "profile", { region: { region, target, regionBox, people: det.people_count, visibility: det.target_visibility, lighting: det.lighting, sharp: det.sharp } as Prisma.InputJsonValue, costCents: cost });
    if (!det.found || !target || det.target_visibility === "hidden") throw new TryOnError("region_not_found", `Região não encontrada (${region}).`, det.guidance_pt || TARGET[region].reject);
    if (det.people_count > 1) throw new TryOnError("multiple_people", "Mais de uma pessoa na foto.", "Use uma foto com apenas uma pessoa.");
    if (det.lighting !== "good" && !det.sharp) throw new TryOnError("photo_quality", "Foto escura/estourada e sem nitidez.", det.guidance_pt || "A foto está sem nitidez e com pouca luz. Tente perto de uma janela, com a câmera firme.");

    // 2. perfil técnico da joia (cache por produto e por imagem de origem)
    t = Date.now();
    const refs = await productReferences(req.product.id);
    let profile = req.product.tryOnSpec as Profile | null;
    if (!profile || req.product.tryOnSpecImage !== refs.firstKey) {
      const p = req.product;
      const catalog = [p.name, p.material, p.color && `metal color: ${p.color}`, p.goldType, p.stoneType && `stones: ${p.stoneType}`, p.finish && `finish: ${p.finish}`, p.widthMm && `width ${p.widthMm} mm`, p.heightMm && `height ${p.heightMm} mm`, p.lengthMm && `length ${p.lengthMm} mm`].filter(Boolean).join("; ");
      profile = await analyze<Profile>(s.analysisModel, profilePrompt(catalog), refs.images, PROFILE_SCHEMA);
      cost += s.analysisCostCents;
      await prisma.product.update({ where: { id: p.id }, data: { tryOnSpec: profile as unknown as Prisma.InputJsonValue, tryOnSpecImage: refs.firstKey } });
    }
    lap("profileMs", t);
    const p = req.product;
    const dims = [p.widthMm && `width ${p.widthMm} mm`, p.heightMm && `height ${p.heightMm} mm`, p.lengthMm && `length ${p.lengthMm} mm`].filter(Boolean).join(", ");
    const dimsText = dims ? ` (${dims})` : "";

    // 3–5. recorte → geração → composição → verificação (com nova tentativa orientada)
    const crop: Rect = cropRect(target, region, W, H);
    const ellipse = blendEllipse(target, crop, region, W, H);
    const origCrop = await sharp(photo).extract(crop).toBuffer();
    const genSide = Math.min(1024, Math.max(768, crop.width));
    const cropForModel = await sharp(origCrop).resize(genSide, Math.round((genSide * crop.height) / crop.width), { fit: "fill" }).jpeg({ quality: 93 }).toBuffer();
    const beforeForVerify: ImagePart = { data: await sharp(origCrop).resize({ width: 768, height: 768, fit: "inside" }).jpeg({ quality: 90 }).toBuffer(), mime: "image/jpeg" };
    let feedback: string | undefined;
    let best: { score: number; result: Buffer; verdict: Verdict; drift: number } | null = null;
    for (let attempt = 1; attempt <= s.maxGenerations; attempt++) {
      await setStage(id, "generate", { generations: attempt, costCents: cost });
      t = Date.now();
      const gen = await generateImage(s.model, generatePrompt(req.category, det, profile, dimsText, feedback), [{ data: cropForModel, mime: "image/jpeg" }, ...refs.images]);
      cost += s.costPerRequestCents; lap(`generate${attempt}Ms`, t);

      await setStage(id, "composite", { costCents: cost });
      t = Date.now();
      const gm = await sharp(gen.data).metadata();
      const fit = centerAspect(gm.width!, gm.height!, crop.width / crop.height);
      const genCrop = await sharp(gen.data).extract(fit).resize(crop.width, crop.height, { fit: "fill" }).removeAlpha().toBuffer();
      const drift = await driftOutside(origCrop, genCrop, crop.width, crop.height, ellipse);
      // o modelo mexeu no enquadramento: mescla o recorte inteiro com borda suave (fora do recorte segue original)
      const mask = drift > 24 ? await borderMask(crop.width, crop.height, ellipse.feather) : await ellipseMask(crop.width, crop.height, ellipse);
      const { data: genRgb, info } = await sharp(genCrop).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
      const ch = info.channels;
      const rgba = Buffer.alloc(crop.width * crop.height * 4);
      for (let i = 0; i < crop.width * crop.height; i++) {
        const j = i * ch;
        rgba[i * 4] = genRgb[j]; rgba[i * 4 + 1] = genRgb[ch >= 3 ? j + 1 : j]; rgba[i * 4 + 2] = genRgb[ch >= 3 ? j + 2 : j]; rgba[i * 4 + 3] = mask[i];
      }
      const layer = await sharp(rgba, { raw: { width: crop.width, height: crop.height, channels: 4 } }).png().toBuffer();
      const result = await sharp(photo).composite([{ input: layer, left: crop.left, top: crop.top }]).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
      lap(`composite${attempt}Ms`, t); metrics[`drift${attempt}`] = Math.round(drift * 10) / 10;

      await setStage(id, "verify", { costCents: cost });
      t = Date.now();
      const after = await sharp(result).extract(crop).resize({ width: 768, height: 768, fit: "inside" }).jpeg({ quality: 90 }).toBuffer();
      const verdict = await analyze<Verdict>(s.analysisModel, verifyPrompt(req.category, profile), [beforeForVerify, { data: after, mime: "image/jpeg" }, ...refs.images], VERIFY_SCHEMA);
      cost += s.analysisCostCents; lap(`verify${attempt}Ms`, t);
      const score = fidelityScore(verdict);
      metrics[`score${attempt}`] = score;
      if (!best || score > best.score) best = { score, result, verdict, drift };
      if (score >= s.fidelityThreshold) break;
      feedback = verdict.issues_en || "the jewelry does not match the reference photos closely enough";
    }

    if (!best || best.score < s.fidelityThreshold) {
      await prisma.tryOnRequest.update({ where: { id }, data: { fidelityScore: best?.score ?? 0, metrics: metrics as Prisma.InputJsonValue } });
      throw new TryOnError("fidelity_low", `Fidelidade ${best?.score ?? 0} abaixo do mínimo ${s.fidelityThreshold}. ${best?.verdict.issues_pt ?? ""}`.trim(),
        "Não conseguimos reproduzir esta peça com a fidelidade que a Luxer exige nesta foto. Tente outra foto, mais próxima e com boa luz.");
    }

    const expiresAt = new Date(Date.now() + s.retentionMinutes * 60_000);
    await prisma.$transaction([
      prisma.tryOnAsset.create({ data: { requestId: id, kind: "RESULT", mime: "image/jpeg", width: W, height: H, data: new Uint8Array(encryptBuffer(best.result)), expiresAt } }),
      prisma.tryOnRequest.update({ where: { id }, data: { status: "SUCCEEDED", stage: "done", fidelityScore: best.score, costCents: cost, durationMs: Date.now() - t0, finishedAt: new Date(), metrics: { ...metrics, issues: best.verdict.issues_pt } as Prisma.InputJsonValue } }),
    ]);
  } catch (e) {
    const err = e instanceof TryOnError ? e : new TryOnError("internal", e instanceof Error ? e.message : String(e));
    const photoProblem = ["region_not_found", "multiple_people", "photo_quality"].includes(err.code);
    await prisma.tryOnRequest.update({
      where: { id },
      data: { status: err.code === "blocked" ? "BLOCKED" : "FAILED", stage: "done", errorCode: err.code, errorMessage: (err.userMessage ? `${err.message} | cliente: ${err.userMessage}` : err.message).slice(0, 600), costCents: cost, durationMs: Date.now() - t0, finishedAt: new Date(), metrics: metrics as Prisma.InputJsonValue },
    }).catch(() => {});
    if (!photoProblem) console.error("[tryon]", id, err.code, err.message);
    if (!photoProblem && err.code !== "blocked" && err.code !== "fidelity_low") {
      const recent = await prisma.tryOnRequest.count({ where: { status: "FAILED", errorCode: { notIn: ["region_not_found", "multiple_people", "photo_quality", "fidelity_low"] }, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
      if (recent === 5) await notify("ai", "LUXER AI com falhas recorrentes", `${recent} falhas técnicas na última hora. Último erro: ${err.message.slice(0, 120)}`, "/admin/luxer-ai").catch(() => {});
    }
  } finally {
    // a foto enviada sai do banco assim que o processamento termina (o navegador mantém a original para a comparação)
    await prisma.tryOnAsset.deleteMany({ where: { requestId: id, kind: "INPUT" } }).catch(() => {});
  }
}

/** Mensagem segura para o cliente a partir do registro (nunca expõe detalhes técnicos). */
export function customerMessage(code: string | null, stored: string | null) {
  const fromModel = stored?.split(" | cliente: ")[1];
  if (fromModel) return fromModel;
  if (code === "blocked") return "Não foi possível usar esta foto. Tente outra imagem, mostrando apenas a região da joia.";
  if (code === "timeout") return "A simulação demorou mais do que o esperado. Tente novamente.";
  return "Não conseguimos gerar a simulação agora. Tente novamente em instantes.";
}

export { toRect };
