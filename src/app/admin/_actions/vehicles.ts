"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Availability, PricingMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { positionedPrice, referenceIsStale } from "@/lib/pricing";
import { safeImageUrl, uploadPublicImage } from "@/lib/media";
import { slugify } from "@/lib/format";
import { bool, fail, moneyToCents, ok, str, type ActionState } from "@/lib/action";

const base = z.object({
  brand: z.string().min(1, "Informe a marca.").max(60),
  name: z.string().min(1, "Informe o modelo.").max(100),
  categoryId: z.string().min(1, "Selecione a categoria."),
  description: z.string().min(5, "Informe a descrição.").max(2000),
  imageCaption: z.string().min(3).max(120),
  kmPerMonth: z.coerce.number().int().min(0).max(100000),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  availability: z.enum(["AVAILABLE", "ON_REQUEST", "UNAVAILABLE"]),
  pricingMode: z.enum(["MANUAL", "REFERENCE"]),
  discountPercent: z.coerce.number().min(0).max(90),
});

function revalidatePublic() {
  for (const p of ["/lvb", "/lvb/veiculos", "/lvb/simulador", "/lvb/solicitar", "/admin/veiculos", "/admin/tarifas"]) revalidatePath(p);
}

export async function saveVehicleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const parsed = base.safeParse(Object.fromEntries(["brand", "name", "categoryId", "description", "imageCaption", "kmPerMonth", "sortOrder", "availability", "pricingMode", "discountPercent"].map((k) => [k, str(fd, k)])));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const v = parsed.data;
  const terms = [12, 24, 36].filter((t) => bool(fd, `term${t}`));
  if (!terms.length) return fail("Selecione ao menos um prazo.");

  const existing = id ? await prisma.vehicle.findUnique({ where: { id } }) : null;
  if (id && !existing) return fail("Veículo não encontrado.");

  // Imagem
  let imageUrl = safeImageUrl(str(fd, "imageUrl"));
  if (str(fd, "imageUrl") && !imageUrl) return fail("URL de imagem inválida (use https:// ou envie um arquivo).");
  const up = await uploadPublicImage(fd.get("image") as File | null, `${v.brand} ${v.name}`);
  if (up && "error" in up) return fail(up.error);
  if (up) imageUrl = up.url;

  // Preço
  let referencePriceCents: number | null = null;
  let referenceDate: Date | null = null;
  const referenceSource = str(fd, "referenceSource").slice(0, 300) || null;
  let suggested: number | null = null;
  if (v.pricingMode === "REFERENCE") {
    referencePriceCents = moneyToCents(str(fd, "referencePrice"));
    referenceDate = str(fd, "referenceDate") ? new Date(str(fd, "referenceDate") + "T12:00:00") : null;
    if (!referencePriceCents) return fail("Informe o valor de referência de mercado.");
    if (!referenceSource) return fail("Informe a fonte da referência de preço (empresa, data e forma de obtenção da cotação).");
    if (!referenceDate || Number.isNaN(referenceDate.getTime())) return fail("Informe a data da cotação de referência.");
    if (referenceDate > new Date()) return fail("A data da referência não pode ser futura.");
    suggested = positionedPrice(referencePriceCents, v.discountPercent);
  } else {
    const proposed = moneyToCents(str(fd, "proposedPrice"));
    if (proposed != null && proposed !== existing?.finalPriceCents) suggested = proposed;
  }
  if (suggested != null && suggested < 10000) return fail("Preço mensal muito baixo. Verifique o valor.");

  const publish = bool(fd, "publishPrice");
  const pricing: Record<string, unknown> = { pricingMode: v.pricingMode as PricingMode, referencePriceCents, referenceSource, referenceDate, discountPercent: v.discountPercent };
  if (publish && suggested != null) {
    if (v.pricingMode === "REFERENCE" && referenceIsStale(referenceDate) && !bool(fd, "confirmStale"))
      return fail("A referência tem mais de 60 dias e pode estar desatualizada. Atualize a cotação ou marque a confirmação para publicar mesmo assim.");
    Object.assign(pricing, { finalPriceCents: suggested, suggestedCents: null, priceValidatedAt: new Date(), priceValidatedBy: admin.email });
  } else {
    pricing.suggestedCents = suggested;
  }

  const slugInput = slugify(str(fd, "slug") || `${v.brand}-${v.name}`);
  const slugTaken = await prisma.vehicle.findFirst({ where: { slug: slugInput, NOT: id ? { id } : undefined } });
  const slug = slugTaken ? `${slugInput}-${Date.now().toString(36)}` : slugInput;

  const data = {
    slug, brand: v.brand, name: v.name, categoryId: v.categoryId, description: v.description,
    features: str(fd, "features").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20),
    imageUrl, imageCaption: v.imageCaption, kmPerMonth: v.kmPerMonth, terms,
    conditions: str(fd, "conditions").slice(0, 3000),
    protectionInfo: str(fd, "protectionInfo").slice(0, 300) || null,
    maintenanceInfo: str(fd, "maintenanceInfo").slice(0, 300) || null,
    availability: v.availability as Availability, active: bool(fd, "active"), sortOrder: v.sortOrder,
    ...pricing,
  };

  const saved = id
    ? await prisma.vehicle.update({ where: { id }, data })
    : await prisma.vehicle.create({ data: data as Parameters<typeof prisma.vehicle.create>[0]["data"] });
  await audit(admin.id, id ? "vehicle.updated" : "vehicle.created", "Vehicle", saved.id, { publishedPrice: publish ? suggested : undefined, suggested });
  revalidatePublic();
  if (!id) redirect(`/admin/veiculos/${saved.id}?criado=1`);
  return ok(publish && suggested != null ? "Veículo salvo e preço publicado." : suggested != null ? "Veículo salvo. Novo preço aguardando validação para publicação." : "Veículo salvo.");
}

export async function validatePriceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const v = await prisma.vehicle.findUnique({ where: { id } });
  if (!v || v.suggestedCents == null) return fail("Não há preço pendente de validação.");
  if (v.pricingMode === "REFERENCE" && referenceIsStale(v.referenceDate) && !bool(fd, "confirmStale"))
    return fail("Referência com mais de 60 dias. Atualize a cotação antes de publicar.");
  await prisma.vehicle.update({ where: { id }, data: { finalPriceCents: v.suggestedCents, suggestedCents: null, priceValidatedAt: new Date(), priceValidatedBy: admin.email } });
  await audit(admin.id, "vehicle.price_validated", "Vehicle", id, { from: v.finalPriceCents, to: v.suggestedCents });
  revalidatePublic();
  return ok("Preço validado e publicado.");
}

export async function discardSuggestionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  await prisma.vehicle.update({ where: { id }, data: { suggestedCents: null } });
  await audit(admin.id, "vehicle.price_suggestion_discarded", "Vehicle", id);
  revalidatePublic();
  return ok("Sugestão descartada.");
}

export async function toggleVehicleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const v = await prisma.vehicle.findUnique({ where: { id } });
  if (!v) return fail("Veículo não encontrado.");
  await prisma.vehicle.update({ where: { id }, data: { active: !v.active } });
  await audit(admin.id, v.active ? "vehicle.deactivated" : "vehicle.activated", "Vehicle", id);
  revalidatePublic();
  return ok(v.active ? "Veículo desativado." : "Veículo ativado.");
}

export async function deleteVehicleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const count = await prisma.serviceRequest.count({ where: { vehicleId: id } });
  if (count > 0) return fail(`Este veículo possui ${count} solicitação(ões) vinculada(s). Desative-o em vez de excluir.`);
  await prisma.vehicle.delete({ where: { id } });
  await audit(admin.id, "vehicle.deleted", "Vehicle", id);
  revalidatePublic();
  redirect("/admin/veiculos?excluido=1");
}
