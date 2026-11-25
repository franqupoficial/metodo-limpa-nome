import sharp from "sharp";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { sameOrigin, clientIp } from "@/lib/request-meta";
import { keyedHash, encryptBuffer, randomToken } from "@/lib/crypto";
import { sniffImage } from "@/lib/images";
import { rateLimit } from "@/lib/rate-limit";
import { providerConfigured } from "@/lib/ai/tryon";
import { validHandLandmarks } from "@/lib/ai/tryon-geometry";
import { runTryOn } from "@/lib/ai/tryon-pipeline";
import { tokenHashOf } from "@/lib/ai/tryon-access";
import { tryOnCategoryFor, REGION_OF } from "@/lib/ai/categories";
import { getCustomer } from "@/lib/customer-auth";
import { visibleWhere } from "@/lib/catalog";

// o processamento continua após a resposta (after); este limite cobre a geração com uma nova tentativa
export const maxDuration = 300;

const err = (status: number, error: string) => Response.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Cria uma simulação do LUXER AI TRY-ON e devolve { id, token } imediatamente.
 * A foto é validada, tem metadados (EXIF/GPS) removidos, é guardada CRIPTOGRAFADA e com expiração
 * apenas durante o processamento, e apagada ao final. O navegador acompanha por GET /api/tryon/{id}.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return err(403, "Origem inválida.");
  const s = (await getSettings()).ai;
  if (!s.tryOnEnabled || !providerConfigured(s.provider)) return err(503, s.unavailableMessage);

  const ip = await clientIp();
  const day = new Date().toISOString().slice(0, 10);
  const clientHash = keyedHash(`tryon|${day}|${ip}`).slice(0, 32);
  const fd = await req.formData().catch(() => null);
  if (!fd) return err(400, "Envio inválido.");
  if (fd.get("consent") !== "true") return err(400, "É necessário autorizar o uso da foto para a simulação.");
  if (!(await rateLimit(`tryon:min:${clientHash}`, 3, 60))) return err(429, "Muitas tentativas seguidas. Aguarde um minuto.");
  const photo = fd.get("photo");
  if (!(photo instanceof File) || !photo.size) return err(400, "Envie uma foto.");
  if (photo.size > 12 * 1024 * 1024) return err(413, "Foto acima de 12 MB.");
  const raw = Buffer.from(await photo.arrayBuffer());
  if (!["jpeg", "png", "webp"].includes(sniffImage(raw) ?? "")) return err(415, "Formato não suportado. Use JPG, PNG ou WebP.");

  const product = await prisma.product.findFirst({
    where: { AND: [visibleWhere(), { slug: String(fd.get("product") ?? "") }, { tryOnEnabled: true }, { images: { some: {} } }] },
    include: { categories: { include: { category: { select: { name: true } } } } },
  });
  if (!product) return err(404, "Peça indisponível para o provador.");
  const category = tryOnCategoryFor(product.categories.map((c) => c.category.name).join(" ") + " " + (product.jewelryType ?? "") + " " + product.name, product.name);
  if (!category || !REGION_OF[category] || !s.categories.includes(category)) return err(400, "Esta peça não está disponível no provador.");

  // proteção de custo e abuso: limite por cliente, um processamento por vez, limite diário da loja e orçamento mensal
  const since = new Date(Date.now() - 86_400_000);
  const monthStart = new Date(new Date().toISOString().slice(0, 8) + "01T03:00:00Z");
  const [mine, running, today, spent] = await Promise.all([
    prisma.tryOnRequest.count({ where: { clientHash, createdAt: { gte: since }, errorCode: { notIn: ["region_not_found", "multiple_people", "photo_quality"] } } }),
    prisma.tryOnRequest.count({ where: { clientHash, status: { in: ["QUEUED", "PROCESSING"] }, createdAt: { gte: new Date(Date.now() - 4 * 60_000) } } }),
    prisma.tryOnRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.tryOnRequest.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { costCents: true } }),
  ]);
  if (running) return err(429, "Já estamos processando uma simulação sua. Aguarde o resultado.");
  if (mine >= s.dailyLimitPerClient) return err(429, `Você atingiu o limite de ${s.dailyLimitPerClient} simulações por dia. Volte amanhã!`);
  const worstCase = s.maxGenerations * (s.costPerRequestCents + s.analysisCostCents) + 2 * s.analysisCostCents;
  if (today >= s.dailyGlobalLimit || (s.monthlyBudgetCents > 0 && (spent._sum.costCents ?? 0) + worstCase > s.monthlyBudgetCents)) return err(503, s.unavailableMessage);

  let person: Buffer, width: number, height: number;
  try {
    const out = await sharp(raw, { failOn: "error" }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer({ resolveWithObject: true });
    person = out.data; width = out.info.width; height = out.info.height;
  } catch {
    return err(415, "Não foi possível ler esta imagem.");
  }
  if (Math.min(width, height) < 480) return err(422, "A foto tem resolução muito baixa. Use uma foto com pelo menos 480 px no menor lado.");

  let hand = null;
  try { hand = validHandLandmarks(JSON.parse(String(fd.get("hand") ?? "null"))); } catch { hand = null; }
  const token = randomToken(24);
  const customer = await getCustomer();
  const row = await prisma.tryOnRequest.create({
    data: {
      productId: product.id, category, provider: s.provider, model: s.model, analysisModel: s.analysisModel, clientHash, customerId: customer?.id, consentAt: new Date(), tokenHash: tokenHashOf(token),
      // articulações da mão medidas no aparelho (MediaPipe), se houver — validadas antes de uso
      region: hand ? { hand } : undefined,
      assets: { create: { kind: "INPUT", mime: "image/jpeg", width, height, data: new Uint8Array(encryptBuffer(person)), expiresAt: new Date(Date.now() + 15 * 60_000) } },
    },
  });
  after(() => runTryOn(row.id));
  return Response.json({ ok: true, id: row.id, token, width, height }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
