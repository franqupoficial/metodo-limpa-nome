import sharp from "sharp";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { sameOrigin, clientIp } from "@/lib/request-meta";
import { keyedHash } from "@/lib/crypto";
import { sniffImage } from "@/lib/images";
import { getObject, putObject } from "@/lib/storage";
import { generateTryOn, providerConfigured, TryOnError } from "@/lib/ai/tryon";
import { tryOnCategoryFor } from "@/lib/ai/categories";
import { getCustomer } from "@/lib/customer-auth";
import { notify } from "@/lib/notifications";
import { visibleWhere } from "@/lib/catalog";

export const maxDuration = 180;

const err = (status: number, error: string) => Response.json({ ok: false, error }, { status });

/**
 * LUXER AI TRY-ON. A foto do cliente é processada em memória (EXIF/GPS removidos), enviada ao provedor
 * e descartada. Só o resultado pode ser retido, se o administrador configurar retenção > 0.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return err(403, "Origem inválida.");
  const s = (await getSettings()).ai;
  if (!s.tryOnEnabled || !providerConfigured(s.provider)) return err(503, s.unavailableMessage);

  const fd = await req.formData().catch(() => null);
  if (!fd) return err(400, "Envio inválido.");
  if (fd.get("consent") !== "true") return err(400, "É necessário autorizar o uso da foto para a simulação.");
  const photo = fd.get("photo");
  if (!(photo instanceof File) || !photo.size) return err(400, "Envie uma foto.");
  if (photo.size > 10 * 1024 * 1024) return err(413, "Foto acima de 10 MB.");
  const raw = Buffer.from(await photo.arrayBuffer());
  if (!sniffImage(raw)) return err(415, "Formato não suportado. Use JPG, PNG ou WebP.");

  const product = await prisma.product.findFirst({
    where: { AND: [visibleWhere(), { slug: String(fd.get("product") ?? "") }, { tryOnEnabled: true }] },
    include: { images: { orderBy: { position: "asc" }, take: 1 }, categories: { include: { category: { select: { name: true } } } } },
  });
  if (!product?.images[0]) return err(404, "Peça indisponível para o provador.");
  const category = tryOnCategoryFor(product.categories.map((c) => c.category.name).join(" ") + " " + (product.jewelryType ?? "") + " " + product.name);
  if (!category || !s.categories.includes(category)) return err(400, "Esta categoria de joia não está disponível no provador.");

  // limites: por cliente (identificador anônimo diário), diário da loja e orçamento mensal
  const day = new Date().toISOString().slice(0, 10);
  const clientHash = keyedHash(`tryon|${day}|${await clientIp()}`).slice(0, 32);
  const since = new Date(Date.now() - 86_400_000);
  const monthStart = new Date(new Date().toISOString().slice(0, 8) + "01T03:00:00Z");
  const [mine, today, spent] = await Promise.all([
    prisma.tryOnRequest.count({ where: { clientHash, createdAt: { gte: since } } }),
    prisma.tryOnRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.tryOnRequest.aggregate({ where: { createdAt: { gte: monthStart }, status: "SUCCEEDED" }, _sum: { costCents: true } }),
  ]);
  if (mine >= s.dailyLimitPerClient) return err(429, `Você atingiu o limite de ${s.dailyLimitPerClient} simulações por dia. Volte amanhã!`);
  if (today >= s.dailyGlobalLimit || (s.monthlyBudgetCents > 0 && (spent._sum.costCents ?? 0) + s.costPerRequestCents > s.monthlyBudgetCents)) return err(503, s.unavailableMessage);

  const person = await sharp(raw, { failOn: "error" }).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  const jewelObj = await getObject(product.images[0].key);
  if (!jewelObj) return err(500, "Imagem da peça indisponível.");
  const jewel = await sharp(jewelObj.body).flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
  const customer = await getCustomer();
  const reqRow = await prisma.tryOnRequest.create({ data: { productId: product.id, category, provider: s.provider, model: s.model, clientHash, customerId: customer?.id, consentAt: new Date() } });
  const t0 = Date.now();
  try {
    const out = await generateTryOn({
      provider: s.provider, model: s.model, category,
      person: { data: person, mime: "image/jpeg" }, jewel: { data: jewel, mime: "image/jpeg" },
      productName: product.name,
      productDetails: [product.material, product.color && `cor ${product.color}`, product.stoneType && `pedras: ${product.stoneType}`, product.widthMm && `largura ${product.widthMm}mm`, product.lengthMm && `comprimento ${product.lengthMm}mm`, product.heightMm && `altura ${product.heightMm}mm`].filter(Boolean).join(", "),
    });
    const result = await sharp(out.image).webp({ quality: 88 }).toBuffer();
    let resultUrl: string | null = null;
    let resultKey: string | null = null;
    if (s.retainResultsHours > 0) {
      resultKey = await putObject(`tryon/${reqRow.id}.webp`, result, "image/webp", "private, no-store");
      resultUrl = `/api/tryon/resultado/${reqRow.id}?k=${keyedHash(`tryon-result|${reqRow.id}`).slice(0, 24)}`;
    }
    await prisma.tryOnRequest.update({ where: { id: reqRow.id }, data: { status: "SUCCEEDED", durationMs: Date.now() - t0, costCents: s.costPerRequestCents, resultKey, resultExpiresAt: resultKey ? new Date(Date.now() + s.retainResultsHours * 3600_000) : null } });
    return Response.json({ ok: true, image: `data:image/webp;base64,${result.toString("base64")}`, url: resultUrl, disclaimer: s.disclaimer }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const code = e instanceof TryOnError ? e.code : "internal";
    const message = e instanceof Error ? e.message.slice(0, 400) : "erro";
    await prisma.tryOnRequest.update({ where: { id: reqRow.id }, data: { status: code === "blocked" ? "BLOCKED" : "FAILED", durationMs: Date.now() - t0, errorCode: code, errorMessage: message } });
    console.error("[tryon]", code, message);
    if (code !== "blocked") {
      const recentFails = await prisma.tryOnRequest.count({ where: { status: "FAILED", createdAt: { gte: new Date(Date.now() - 3600_000) } } });
      if (recentFails === 5) await notify("ai", "Luxer AI com falhas recorrentes", `${recentFails} falhas na última hora. Último erro: ${message.slice(0, 120)}`, "/admin/luxer-ai");
    }
    return err(code === "blocked" ? 422 : 502, code === "blocked" ? "Não foi possível usar esta foto. Tente outra imagem, com boa iluminação e mostrando a região da joia." : "Não conseguimos gerar a simulação agora. Tente novamente em instantes.");
  }
}
