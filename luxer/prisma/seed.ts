/**
 * Seed idempotente: cria apenas o que falta. Nunca sobrescreve dados editados no painel.
 * - Proprietário inicial (OWNER_EMAIL). Senha: OWNER_INITIAL_PASSWORD (opcional, só no primeiro deploy)
 *   ou `npm run admin:create-owner` / fluxo "Esqueci minha senha".
 * - Páginas institucionais importadas do site atual (data/catalog.json).
 * - Seções da homepage (estrutura editável; sem conteúdo fictício).
 * - Perguntas frequentes derivadas literalmente das políticas publicadas no site atual.
 */
import { existsSync, readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { slugify } from "../src/lib/format";
import { ensureDefaultFlows } from "../src/lib/remarketing";

async function owner() {
  const email = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
  if (!email) {
    console.log("OWNER_EMAIL não definido — nenhum proprietário criado.");
    return;
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  const pass = process.env.OWNER_INITIAL_PASSWORD;
  if (!existing) {
    await prisma.adminUser.create({ data: { email, name: process.env.OWNER_NAME || "Proprietário", role: "OWNER", passwordHash: pass ? await bcrypt.hash(pass, 12) : null } });
    console.log(`Proprietário criado: ${email}${pass ? " (senha inicial aplicada)" : " (defina a senha)"}`);
  } else if (!existing.passwordHash && pass) {
    await prisma.adminUser.update({ where: { id: existing.id }, data: { passwordHash: await bcrypt.hash(pass, 12) } });
  }
}

const REVIEW_NEEDED = new Set(["Como Comprar na Loja", "Formas de Pagamento"]);

async function pages() {
  const file = "data/catalog.json";
  if (!existsSync(file)) return;
  const cat = JSON.parse(readFileSync(file, "utf8")) as { institutional: { title: string; markdown: string | null; sourceUrl: string }[] };
  let pos = 0;
  for (const p of cat.institutional) {
    if (!p.markdown) continue;
    const slug = slugify(p.title);
    const exists = await prisma.page.findUnique({ where: { slug } });
    if (exists) continue;
    const type = /troca|privacidade|termos|garantia|entrega|pagamento/i.test(p.title) ? "POLICY" : p.title === "Quem Somos" ? "STORY" : "INSTITUTIONAL";
    // páginas cujo processo mudou na nova loja (ex.: boleto → Pix) entram como rascunho para revisão
    const review = REVIEW_NEEDED.has(p.title);
    await prisma.page.create({
      data: {
        slug, title: p.title, type, position: pos++,
        content: review ? "" : p.markdown,
        draft: review ? `> Texto importado do site anterior. Revise antes de publicar: o processo de compra e as formas de pagamento mudaram na nova loja.\n\n${p.markdown}` : null,
        published: !review, publishedAt: review ? null : new Date(),
      },
    });
  }
}

async function home() {
  if (await prisma.homeSection.count()) return;
  const sections: { type: string; title?: string; subtitle?: string; config?: object }[] = [
    { type: "HERO" },
    { type: "CATEGORIES", title: "Explore por categoria" },
    { type: "BESTSELLERS", title: "Mais desejadas", subtitle: "As peças preferidas de nossos clientes", config: { limit: 8 } },
    { type: "NEW", title: "Novidades", config: { limit: 8 } },
    { type: "COLLECTIONS", title: "Coleções" },
    { type: "FAITH", title: "Luxer Fé", subtitle: "Joias que carregam devoção" },
    { type: "TRYON", title: "Experimente antes de escolher", subtitle: "LUXER AI TRY-ON" },
    { type: "STORY", title: "Nossa história", config: { pageSlug: "quem-somos" } },
    { type: "REVIEWS", title: "Quem compra, recomenda" },
    { type: "INSTAGRAM", title: "@luxerjoias" },
    { type: "NEWSLETTER", title: "Receba novidades em primeira mão" },
  ];
  await prisma.homeSection.createMany({ data: sections.map((s, i) => ({ ...s, position: i })) });
}

/** Garante a seção Atelier Concierge logo após a abertura (instalações existentes). */
async function atelier() {
  if (await prisma.homeSection.findFirst({ where: { type: "ATELIER" } })) return;
  const hero = await prisma.homeSection.findFirst({ where: { type: "HERO" } });
  const pos = (hero?.position ?? 0) + 1;
  await prisma.homeSection.updateMany({ where: { position: { gte: pos } }, data: { position: { increment: 1 } } });
  await prisma.homeSection.create({ data: { type: "ATELIER", title: "Encontre a joia ideal em três escolhas", subtitle: "Atelier Concierge", position: pos } });
}

async function faq() {
  if (await prisma.faqItem.count()) return;
  // Respostas extraídas das políticas publicadas pela própria Luxer no site atual.
  const items = [
    { group: "Entrega", question: "Qual é o prazo de entrega?", answer: "O prazo de entrega é de 10 dias úteis acrescido do prazo da transportadora, contado a partir da aprovação do pagamento. Todos os produtos estão sujeitos à disponibilidade de estoque." },
    { group: "Entrega", question: "Como é calculado o frete?", answer: "O frete é calculado automaticamente conforme a localidade de entrega. Pontualmente pode haver frete grátis em promoções, para determinadas regiões ou valores de compra." },
    { group: "Trocas e garantia", question: "Posso desistir da compra?", answer: "Sim. O prazo para desistir da compra é de até 7 (sete) dias úteis a contar do recebimento do pedido; nesse caso, o valor pago é restituído, inclusive o frete. A peça deve ser devolvida sem indícios de uso, na embalagem original e acompanhada da nota fiscal." },
    { group: "Trocas e garantia", question: "Qual é a garantia das joias?", answer: "As joias têm 90 dias de garantia contra defeitos de fabricação. A garantia não cobre danos por quedas, acidentes, mau uso ou contato com produtos químicos." },
    { group: "Produtos", question: "As joias são de ouro 18k?", answer: "Sim. A Luxer garante o teor do ouro 18 quilates e acompanha cada pedido de certificado de garantia e nota fiscal." },
  ];
  await prisma.faqItem.createMany({ data: items.map((f, i) => ({ ...f, position: i })) });
}

async function main() {
  await owner();
  await pages();
  await home();
  await faq();
  await atelier();
  await ensureDefaultFlows(); // fluxos de remarketing criados DESATIVADOS
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
