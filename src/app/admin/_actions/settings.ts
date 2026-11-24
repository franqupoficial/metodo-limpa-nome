"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getSetting, setSetting, type InclusionStatus } from "@/lib/settings";
import { slugify } from "@/lib/format";
import { bool, fail, moneyToCents, ok, str, type ActionState } from "@/lib/action";

const revalidateAll = () => revalidatePath("/", "layout");

export async function saveCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const startingCents = moneyToCents(str(fd, "starting"));
  if (name.length < 2) return fail("Informe o nome da categoria.");
  if (startingCents == null) return fail("Informe o valor inicial de referência.");
  const data = {
    name, description: str(fd, "description").slice(0, 500), referenceModels: str(fd, "referenceModels").slice(0, 300),
    startingCents, sortOrder: Number(str(fd, "sortOrder")) || 0, active: bool(fd, "active"),
  };
  if (id) await prisma.vehicleCategory.update({ where: { id }, data });
  else {
    const slug = slugify(name);
    if (await prisma.vehicleCategory.findUnique({ where: { slug } })) return fail("Já existe uma categoria com esse nome.");
    await prisma.vehicleCategory.create({ data: { ...data, slug } });
  }
  await audit(admin.id, id ? "category.updated" : "category.created", "VehicleCategory", id || name, data);
  revalidateAll();
  return ok("Categoria salva.");
}

export async function saveServicePricesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("ADMIN");
  const pix = moneyToCents(str(fd, "pix"));
  const cons0 = await getSetting("service.consumidor");
  const inst = cons0.installmentCents;
  const maxInst = cons0.maxInstallments;
  const cnpj = moneyToCents(str(fd, "cnpj"));
  const loanMin = moneyToCents(str(fd, "loanMin"));
  const loanMax = moneyToCents(str(fd, "loanMax"));
  if ([pix, cnpj, loanMin, loanMax].some((v) => v == null)) return fail("Revise os valores informados.");
  if (loanMin! >= loanMax!) return fail("O valor mínimo do empréstimo deve ser menor que o máximo.");
  await setSetting("service.consumidor", { ...cons0, pixCents: pix!, installmentCents: inst, maxInstallments: maxInst, scope: str(fd, "scope") || cons0.scope });
  await setSetting("service.cnpj", { priceCents: cnpj! });
  await setSetting("service.emprestimo", { minCents: loanMin!, maxCents: loanMax! });
  await audit(admin.id, "settings.service_prices", "Setting", "service.*", { pix, inst, maxInst, cnpj, loanMin, loanMax });
  revalidateAll();
  return ok("Valores dos serviços atualizados.");
}

export async function saveFreezeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("ADMIN");
  const enabled = bool(fd, "enabled");
  const value = { enabled, title: str(fd, "title").slice(0, 120) || "Congelamento de apontamentos por 12 meses", description: str(fd, "description").slice(0, 3000), legalBasis: str(fd, "legalBasis").slice(0, 3000) };
  if (enabled && (value.description.length < 20 || value.legalBasis.length < 20))
    return fail("Para exibir este bloco, descreva o procedimento e informe a base jurídica e operacional comprovada (norma, decisão ou contrato que o sustenta).");
  await setSetting("service.consumidor.freeze", value);
  await audit(admin.id, "settings.consumidor_freeze", "Setting", "service.consumidor.freeze", { enabled });
  revalidateAll();
  return ok(enabled ? "Bloco publicado na página de Regularização." : "Bloco desativado.");
}

export async function saveLvbPlansAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const adj = (t: number) => Number(str(fd, `adj${t}`).replace(",", ".")) || 0;
  const termAdjustments = { "12": adj(12), "24": adj(24), "36": adj(36) };
  if (Object.values(termAdjustments).some((v) => v < -50 || v > 100)) return fail("Ajustes de prazo devem estar entre −50% e +100%.");
  const kmPackages = [0, 1, 2, 3, 4]
    .map((i) => ({ id: slugify(str(fd, `km${i}label`)) || `km${i}`, label: str(fd, `km${i}label`).slice(0, 60), surchargePercent: Number(str(fd, `km${i}pct`).replace(",", ".")) || 0 }))
    .filter((k) => k.label);
  const inclusionSchema = z.enum(["INCLUDED", "NOT_INCLUDED", "TO_CONFIRM"]);
  const inc = (k: string) => (inclusionSchema.safeParse(str(fd, k)).success ? (str(fd, k) as InclusionStatus) : "TO_CONFIRM");
  const costs = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ label: str(fd, `cost${i}label`).slice(0, 80), description: str(fd, `cost${i}desc`).slice(0, 400) })).filter((c) => c.label);
  await setSetting("lvb.plans", { termAdjustments, kmPackages, priceNotice: str(fd, "priceNotice").slice(0, 500), deliveryWindow: str(fd, "deliveryWindow").slice(0, 60) || "7 a 15 dias" });
  await setSetting("lvb.inclusions", { maintenance: inc("maintenance"), ipva: inc("ipva"), insurance: inc("insurance"), assistance: inc("assistance"), notes: str(fd, "inclusionNotes").slice(0, 500) });
  await setSetting("lvb.costs", costs);
  await audit(admin.id, "settings.lvb_plans", "Setting", "lvb.*", { termAdjustments, kmPackages, costs: costs.length });
  revalidateAll();
  return ok("Configurações de planos LVB atualizadas.");
}

export async function saveContactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("ADMIN");
  const email = str(fd, "email");
  if (email && !z.string().email().safeParse(email).success) return fail("E-mail de contato inválido.");
  await setSetting("site.contact", {
    email, phone: str(fd, "phone").slice(0, 30), whatsapp: str(fd, "whatsapp").slice(0, 30), hours: str(fd, "hours").slice(0, 120),
    companyName: str(fd, "companyName").slice(0, 160), cnpj: str(fd, "cnpj").slice(0, 20), address: str(fd, "address").slice(0, 300),
  });
  const days = Number(str(fd, "retentionDays"));
  if (!(days >= 180 && days <= 3650)) return fail("Prazo de retenção deve estar entre 180 e 3650 dias.");
  await setSetting("privacy.retention", { retentionDays: days });
  await audit(admin.id, "settings.contact", "Setting", "site.contact");
  revalidateAll();
  return ok("Configurações salvas.");
}

export async function saveServicesEnabledAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("ADMIN");
  const value = { CONSUMIDOR: bool(fd, "CONSUMIDOR"), CNPJ: bool(fd, "CNPJ"), EMPRESTIMO: bool(fd, "EMPRESTIMO"), LVB: bool(fd, "LVB") };
  await setSetting("services.enabled", value);
  await audit(admin.id, "settings.services_enabled", "Setting", "services.enabled", value);
  revalidateAll();
  return ok("Serviços do site atualizados.");
}

export async function savePixAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("ADMIN");
  const key = str(fd, "key");
  const receiverName = str(fd, "receiverName");
  const city = str(fd, "city");
  const validKey =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key) || // aleatória
    /^\+55\d{10,11}$/.test(key) || /^\d{11}$|^\d{14}$/.test(key) || z.string().email().safeParse(key).success;
  if (!validKey) return fail("Chave Pix inválida. Use a chave aleatória (formato 00000000-0000-0000-0000-000000000000), CPF/CNPJ só números, e-mail ou +55DDDNÚMERO.");
  if (receiverName.length < 3 || receiverName.length > 25) return fail("Nome do recebedor: 3 a 25 caracteres.");
  if (city.length < 2 || city.length > 15) return fail("Cidade: 2 a 15 caracteres.");
  await setSetting("payment.pix", { key, receiverName, city, instructions: str(fd, "instructions").slice(0, 300) });
  await audit(admin.id, "settings.pix", "Setting", "payment.pix", { keyEnd: key.slice(-6) });
  revalidateAll();
  return ok("Dados do Pix salvos. Novas cobranças usarão esta chave.");
}

export async function savePageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin("ADMIN");
  const slug = str(fd, "slug");
  const title = str(fd, "title");
  const content = String(fd.get("content") ?? "");
  if (!["privacidade", "termos", "lvb-politicas"].includes(slug)) return fail("Página inválida.");
  if (title.length < 3 || content.length < 20) return fail("Informe título e conteúdo.");
  await prisma.page.update({ where: { slug }, data: { title, content: content.slice(0, 60000), legalReviewed: bool(fd, "legalReviewed") } });
  await audit(admin.id, "page.updated", "Page", slug, { legalReviewed: bool(fd, "legalReviewed") });
  revalidateAll();
  return ok("Página atualizada.");
}
