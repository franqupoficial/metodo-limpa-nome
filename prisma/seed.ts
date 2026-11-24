import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PRIVACIDADE, TERMOS, LVB_POLITICAS } from "./content/pages";
import { NEWS } from "./content/news";
import { NEWS2 } from "./content/news2";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

/** Valores mensais: referência de mercado com cerca de 10% de desconto de posicionamento. Editáveis no painel. */
const CATEGORIES = [
  { slug: "economico", name: "Econômico", description: "Compactos de entrada, econômicos no consumo e na manutenção.", referenceModels: "Renault Kwid ou Fiat Mobi", startingCents: 162000 },
  { slug: "compacto", name: "Compacto", description: "Hatches com mais espaço interno e conforto para a rotina.", referenceModels: "Fiat Argo ou Chevrolet Onix", startingCents: 180000 },
  { slug: "sedan", name: "Sedan", description: "Porta-malas amplo e conforto para passageiros.", referenceModels: "Fiat Cronos ou Nissan Versa", startingCents: 189000 },
  { slug: "comfort", name: "Comfort", description: "Modelos aceitos nas categorias de maior conforto dos aplicativos.", referenceModels: "Volkswagen Polo ou Hyundai HB20", startingCents: 198000 },
  { slug: "suv", name: "SUV", description: "Posição de dirigir elevada, espaço e robustez.", referenceModels: "Hyundai Creta ou Nissan Kicks", startingCents: 252000 },
  { slug: "premium-eletrificado", name: "Premium / Eletrificado", description: "Elétricos e híbridos com baixo custo por quilômetro.", referenceModels: "BYD Dolphin ou Toyota Corolla Cross Hybrid", startingCents: 297000 },
];

const BASE_FEATURES = ["5 lugares", "Ar-condicionado", "Direção elétrica", "Seguro, manutenção e IPVA inclusos"];

/** Duas opções por categoria. `legacySlug` preserva o endereço de veículos já publicados. */
const CATALOG = [
  { cat: "economico", photo: "kwid", brand: "Renault", name: "Kwid", slug: "economico-renault-kwid-ou-similar", price: 162000, features: ["Motor 1.0", ...BASE_FEATURES] },
  { cat: "economico", photo: "mobi", brand: "Fiat", name: "Mobi", slug: "economico-fiat-mobi-ou-similar", price: 162000, features: ["Motor 1.0", ...BASE_FEATURES] },
  { cat: "compacto", photo: "argo", brand: "Fiat", name: "Argo", slug: "compacto-fiat-argo-ou-similar", price: 180000, features: ["Motor 1.0 ou 1.3", ...BASE_FEATURES] },
  { cat: "compacto", photo: "onix", brand: "Chevrolet", name: "Onix", slug: "compacto-chevrolet-onix-ou-similar", price: 180000, features: ["Motor 1.0", ...BASE_FEATURES] },
  { cat: "sedan", photo: "cronos", brand: "Fiat", name: "Cronos", slug: "sedan-fiat-cronos-ou-similar", price: 189000, features: ["Porta-malas de sedã", ...BASE_FEATURES] },
  { cat: "sedan", photo: "versa", brand: "Nissan", name: "Versa", slug: "sedan-nissan-versa-ou-similar", price: 189000, features: ["Porta-malas de sedã", ...BASE_FEATURES] },
  { cat: "comfort", photo: "polo", brand: "Volkswagen", name: "Polo", slug: "comfort-volkswagen-polo-ou-similar", price: 198000, features: ["Aceito em categorias Comfort", ...BASE_FEATURES] },
  { cat: "comfort", photo: "hb20", brand: "Hyundai", name: "HB20", slug: "comfort-hyundai-hb20-versoes-elegiveis-ou-similar", price: 198000, features: ["Aceito em categorias Comfort", ...BASE_FEATURES] },
  { cat: "suv", photo: "creta", brand: "Hyundai", name: "Creta", slug: "suv-hyundai-creta-ou-similar", price: 252000, features: ["SUV", "Câmbio automático", ...BASE_FEATURES] },
  { cat: "suv", photo: "kicks", brand: "Nissan", name: "Kicks", slug: "suv-nissan-kicks-ou-similar", price: 252000, features: ["SUV", "Câmbio automático (CVT)", ...BASE_FEATURES] },
  { cat: "premium-eletrificado", photo: "dolphin", brand: "BYD", name: "Dolphin", slug: "premium-eletrificado-selecao-lvb-premium-eletrificado-modelo-sob-consulta", newSlug: "premium-byd-dolphin", price: 297000, features: ["100% elétrico", "Câmbio automático", ...BASE_FEATURES] },
  { cat: "premium-eletrificado", photo: "corollacross", brand: "Toyota", name: "Corolla Cross Hybrid", slug: "premium-toyota-corolla-cross-hybrid", price: 297000, features: ["Híbrido", "SUV", "Câmbio automático", ...BASE_FEATURES] },
];

type Photo = { thumb: string; license: string; artist: string; page: string } | null;
let PHOTOS: Record<string, Photo> = {};
try { PHOTOS = JSON.parse(readFileSync(join(__dirname, "content", "vehicle-photos.json"), "utf8")); } catch { /* sem fotos */ }
const photoData = (key: string) => {
  const p = PHOTOS[key];
  if (!p) return { imageUrl: null, imageCaption: "Imagem ilustrativa do modelo" };
  return { imageUrl: p.thumb, imageCaption: `Foto ilustrativa do modelo · ${p.artist || "Wikimedia Commons"} · ${p.license}` };
};

/** Versão dos dados de conteúdo. Cada passo roda uma única vez por banco e não sobrescreve edições posteriores do painel. */
const DATA_VERSION = 2;

async function syncCatalog() {
  const cats = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await prisma.vehicleCategory.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, description: c.description, referenceModels: c.referenceModels, startingCents: c.startingCents, sortOrder: i },
      update: { name: c.name, description: c.description, referenceModels: c.referenceModels, startingCents: c.startingCents },
    });
    cats.set(c.slug, cat.id);
  }
  const keep: string[] = [];
  for (const [j, v] of CATALOG.entries()) {
    const existing = (await prisma.vehicle.findUnique({ where: { slug: v.slug } })) ?? (v.newSlug ? await prisma.vehicle.findUnique({ where: { slug: v.newSlug } }) : null);
    const data = {
      brand: v.brand, name: v.name, categoryId: cats.get(v.cat)!, sortOrder: j % 2,
      description: `${v.brand} ${v.name} para trabalhar com aplicativos. Valor mensal com seguro, manutenção, assistência 24h e IPVA inclusos. O veículo entregue é deste modelo ou de modelo equivalente da mesma categoria, conforme a frota.`,
      features: v.features, ...photoData(v.photo), kmPerMonth: 5000, terms: [12, 24, 36],
      conditions: "Primeira parcela via Pix na contratação e demais parcelas mensais por Pix ou boleto. Caução, quilometragem excedente e franquia em caso de sinistro conforme contrato.",
      availability: "AVAILABLE" as const, active: true, pricingMode: "MANUAL" as const,
      finalPriceCents: v.price, suggestedCents: null, priceValidatedAt: new Date(), priceValidatedBy: "Atualização de catálogo (referência de mercado −10%)",
    };
    const slug = v.newSlug ?? v.slug;
    const saved = existing
      ? await prisma.vehicle.update({ where: { id: existing.id }, data: { ...data, slug } })
      : await prisma.vehicle.create({ data: { ...data, slug } });
    keep.push(saved.id);
  }
  await prisma.vehicle.updateMany({ where: { id: { notIn: keep } }, data: { active: false } });
}

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (adminEmail) {
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      create: { email: adminEmail, name: "Administrador", role: "ADMIN" },
      update: { role: "ADMIN", active: true },
    });
    // Senha inicial opcional via variável de ambiente (definida no painel da hospedagem, nunca no código).
    // Só é aplicada se o administrador ainda não tiver senha.
    const initial = process.env.ADMIN_INITIAL_PASSWORD ?? "";
    const strong = initial.length >= 12 && /[a-z]/.test(initial) && /[A-Z]/.test(initial) && /\d/.test(initial) && /[^A-Za-z0-9]/.test(initial);
    const admin = await prisma.adminUser.findUniqueOrThrow({ where: { email: adminEmail } });
    if (initial && !admin.passwordHash) {
      if (strong) {
        await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(initial, 12) } });
        console.log(`Senha inicial aplicada para ${adminEmail}. Remova ADMIN_INITIAL_PASSWORD da hospedagem e troque a senha no painel.`);
      } else console.warn("ADMIN_INITIAL_PASSWORD ignorada: mínimo de 12 caracteres, com maiúsculas, minúsculas, números e símbolo.");
    }
    console.log(`Administrador inicial: ${adminEmail}`);
  }

  const pages = [
    { slug: "privacidade", title: "Política de privacidade", content: PRIVACIDADE },
    { slug: "termos", title: "Termos de uso", content: TERMOS },
    { slug: "lvb-politicas", title: "Políticas da locação LVB", content: LVB_POLITICAS },
  ];
  for (const p of pages) await prisma.page.upsert({ where: { slug: p.slug }, create: p, update: {} });

  const versionRow = await prisma.setting.findUnique({ where: { key: "seed.dataVersion" } });
  const version = Number((versionRow?.value as { v?: number } | null)?.v ?? 0);
  if (version < 2) {
    await syncCatalog();
    // textos institucionais ainda não revisados juridicamente recebem a versão atual
    for (const p of pages) await prisma.page.updateMany({ where: { slug: p.slug, legalReviewed: false }, data: { content: p.content } });
    console.log("Catálogo e páginas atualizados (versão de dados 2).");
  }
  await prisma.setting.upsert({ where: { key: "seed.dataVersion" }, create: { key: "seed.dataVersion", value: { v: DATA_VERSION } }, update: { value: { v: Math.max(version, DATA_VERSION) } } });

  const all = [...NEWS, ...NEWS2];
  const now = Date.now();
  for (const [i, n] of all.entries()) {
    await prisma.newsPost.upsert({
      where: { slug: n.slug },
      create: { ...n, author: "Equipe editorial Portal Consumidor", related: [], published: true, publishedAt: new Date(now - i * 2 * 86_400_000) },
      update: {},
    });
  }
  console.log("Seed concluído.");
}

main().finally(() => prisma.$disconnect());
