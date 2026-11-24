import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PRIVACIDADE, TERMOS, LVB_POLITICAS } from "./content/pages";
import { NEWS } from "./content/news";

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "economico", name: "Econômico", description: "Compactos de entrada, econômicos no consumo e na manutenção.", referenceModels: "Renault Kwid, Fiat Mobi ou similar", startingCents: 144000, models: [["Renault", "Kwid ou similar"], ["Fiat", "Mobi ou similar"]] },
  { slug: "compacto", name: "Compacto", description: "Hatches com mais espaço interno e conforto para a rotina.", referenceModels: "Fiat Argo, Hyundai HB20, Chevrolet Onix ou similar", startingCents: 160000, models: [["Fiat", "Argo ou similar"], ["Hyundai", "HB20 ou similar"], ["Chevrolet", "Onix ou similar"]] },
  { slug: "sedan", name: "Sedan", description: "Porta-malas amplo e conforto para passageiros.", referenceModels: "Fiat Cronos, Nissan Versa, Hyundai HB20S ou similar", startingCents: 168000, models: [["Fiat", "Cronos ou similar"], ["Nissan", "Versa ou similar"], ["Hyundai", "HB20S ou similar"]] },
  { slug: "comfort", name: "Comfort", description: "Modelos elegíveis a categorias de maior conforto, conforme plataforma e disponibilidade.", referenceModels: "Volkswagen Polo, Hyundai HB20 e outros modelos elegíveis", startingCents: 176000, models: [["Volkswagen", "Polo ou similar"], ["Hyundai", "HB20 (versões elegíveis) ou similar"]] },
  { slug: "suv", name: "SUV", description: "Posição de dirigir elevada, espaço e robustez.", referenceModels: "Hyundai Creta, Nissan Kicks ou similar", startingCents: 224000, models: [["Hyundai", "Creta ou similar"], ["Nissan", "Kicks ou similar"]] },
  { slug: "premium-eletrificado", name: "Premium / Eletrificado", description: "Modelos selecionados, conforme disponibilidade real.", referenceModels: "Modelos selecionados conforme disponibilidade", startingCents: 264000, models: [["Seleção LVB", "Premium / eletrificado (modelo sob consulta)"]] },
];

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

  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await prisma.vehicleCategory.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, description: c.description, referenceModels: c.referenceModels, startingCents: c.startingCents, sortOrder: i },
      update: {},
    });
    for (const [j, [brand, name]] of c.models.entries()) {
      const slug = `${c.slug}-${brand}-${name}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
      const premium = c.slug === "premium-eletrificado";
      await prisma.vehicle.upsert({
        where: { slug },
        create: {
          slug, brand, name, categoryId: cat.id, sortOrder: j,
          description: premium
            ? "Categoria com modelos selecionados, sujeitos à disponibilidade real da operação. O modelo é informado na proposta."
            : `Modelo de referência da categoria ${c.name}. O veículo entregue pode ser este modelo ou outro similar da mesma categoria, conforme disponibilidade.`,
          features: premium ? ["Modelo informado na proposta", "Sujeito à disponibilidade"] : ["5 lugares", "4 portas", "Ar-condicionado"],
          imageCaption: "Imagem ilustrativa de modelo similar",
          kmPerMonth: 5000,
          terms: [12, 24, 36],
          conditions: "Valores de referência. Condições completas, coberturas e custos adicionais são apresentados na proposta, antes da contratação.",
          availability: "ON_REQUEST",
          pricingMode: "MANUAL",
          finalPriceCents: c.startingCents,
          priceValidatedAt: new Date(),
          priceValidatedBy: "Carga inicial (valores ilustrativos definidos pelo administrador)",
        },
        update: {},
      });
    }
  }

  const pages = [
    { slug: "privacidade", title: "Política de privacidade", content: PRIVACIDADE },
    { slug: "termos", title: "Termos de uso", content: TERMOS },
    { slug: "lvb-politicas", title: "Políticas da locação LVB", content: LVB_POLITICAS },
  ];
  for (const p of pages) await prisma.page.upsert({ where: { slug: p.slug }, create: p, update: {} });

  const now = Date.now();
  for (const [i, n] of NEWS.entries()) {
    await prisma.newsPost.upsert({
      where: { slug: n.slug },
      create: { ...n, author: "Equipe editorial Portal Consumidor", related: [], published: true, publishedAt: new Date(now - i * 3 * 86_400_000) },
      update: {},
    });
  }
  console.log("Seed concluído.");
}

main().finally(() => prisma.$disconnect());
