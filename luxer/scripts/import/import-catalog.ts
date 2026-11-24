/**
 * Importa data/catalog.json (gerado por scrape_luxer.py) para o banco e o armazenamento.
 * Idempotente: produtos são identificados pelo ID de origem (sourceId). Reexecutar atualiza dados
 * importados, mas NÃO sobrescreve campos editados no painel quando --keep-edits for usado.
 *
 * Uso: npm run catalog:import -- [--images storage/catalog-originals] [--skip-images] [--keep-edits]
 *
 * Estoque: o site de origem não publica quantidades — apenas disponibilidade. Por isso os produtos
 * disponíveis entram com controle de estoque DESATIVADO (venda conforme disponibilidade, como no site
 * atual) e as variações indisponíveis entram inativas. Ao fazer o inventário no painel, o controle é ativado.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "../../src/lib/db";
import { storeImage } from "../../src/lib/images";
import { slugify } from "../../src/lib/format";

type Src = {
  categories: { sourceId: number; code: string; name: string }[];
  subcategories: { sourceId: number; slug: string; name: string; categoryCode: string; categorySourceId: number }[];
  products: {
    sourceId: number; sourceUrl: string; ref: string | null; name: string | null; description: string | null;
    specLines: string[]; specs: Record<string, string>; color: string | null; material: string | null; stones: string | null;
    weightG: number | null; dimensions: Record<string, number>; price: number | null; compareAtPrice: number | null;
    pixPrice: number | null; installments: number | null; installmentValue: number | null; optionName: string | null;
    variants: { sku: string; option: string | null; price: number | null; available: boolean | null }[];
    available: boolean | null; images: string[]; localImages?: string[]; videos: string[];
    categories: { categorySourceId: number; subcategorySourceId: number }[];
    parentCategories?: number[];
  }[];
};

const PARENT_NAMES: Record<string, string> = {
  ALIANCAS: "Alianças", ANEL: "Anéis", BRINCO: "Brincos", CONJUNTOS: "Conjuntos", CORRENTE: "Correntes e Colares",
  PINGENTE: "Pingentes", PULSEIRA: "Pulseiras", RELIGIOSA: "Religiosas", TORNOZELEIRA: "Tornozeleiras",
};
const TYPE_BY_PARENT: Record<string, string> = {
  ALIANCAS: "Aliança", ANEL: "Anel", BRINCO: "Brinco", CONJUNTOS: "Conjunto", CORRENTE: "Corrente/Colar",
  PINGENTE: "Pingente", PULSEIRA: "Pulseira", RELIGIOSA: "Joia religiosa", TORNOZELEIRA: "Tornozeleira",
};
const FAITH_SUB = /religios|santo|santa|anjo|cruz|crucifixo|escapul|terço|terco|jesus|nossa senhora|espírito|espirito/i;

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const opt = (f: string) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);

// o site de origem mistura Windows-1252 em páginas ISO-8859-1: corrige os caracteres de controle C1
const CP1252: Record<string, string> = { "\u0091": "‘", "\u0092": "’", "\u0093": "“", "\u0094": "”", "\u0096": "–", "\u0097": "—", "\u0085": "…", "\u0095": "•" };
const fix = <T,>(v: T): T => (typeof v === "string" ? (v.replace(/[\u0080-\u009f]/g, (c) => CP1252[c] ?? "") as T) : v);
function fixDeep<T>(o: T): T {
  if (typeof o === "string") return fix(o);
  if (Array.isArray(o)) return o.map(fixDeep) as T;
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fixDeep(v)])) as T;
  return o;
}

const cents = (v: number | null | undefined) => (v == null ? null : Math.round(v * 100));
const LABELS: Record<string, string> = { color: "Cor", dimensions: "Dimensões médias", stones: "Pedras", weight: "Peso médio", material: "Material", length: "Comprimento", width: "Largura", thickness: "Espessura", height: "Altura", clasp: "Fecho", finish: "Acabamento", size: "Tamanho" };

function cleanName(n: string, ref: string | null) {
  let s = n.replace(/\s+/g, " ").trim();
  if (ref) s = s.replace(new RegExp(`\\s*[-–—]?\\s*${ref}\\s*$`), "");
  s = s.replace(/^-+\s*/, "").replace(/\s*[-–—]\s*$/, "").trim();
  return s.replace(/\bKilates\b/g, "Kilates");
}

async function main() {
  const file = path.resolve(opt("--catalog") ?? "data/catalog.json");
  const imgDir = path.resolve(opt("--images") ?? "storage/catalog-originals");
  const skipImages = flag("--skip-images");
  const keepEdits = flag("--keep-edits");
  const src = fixDeep(JSON.parse(readFileSync(file, "utf8")) as Src);

  // categorias
  const catIds = new Map<number, string>();
  const parentCode = new Map<number, string>();
  let pos = 0;
  for (const c of src.categories) {
    const name = PARENT_NAMES[c.code] ?? c.name;
    const slug = slugify(name);
    const faith = c.code === "RELIGIOSA";
    const row = await prisma.category.upsert({
      where: { slug },
      create: { name, slug, sourceId: c.sourceId, position: pos++, faith },
      update: { sourceId: c.sourceId },
    });
    catIds.set(c.sourceId, row.id);
    parentCode.set(c.sourceId, c.code);
  }
  const subIds = new Map<number, string>();
  for (const s of src.subcategories) {
    const parentId = catIds.get(s.categorySourceId);
    const slug = slugify(s.name);
    const faith = s.categoryCode === "RELIGIOSA" || FAITH_SUB.test(s.name);
    const row = await prisma.category.upsert({
      where: { slug },
      create: { name: s.name, slug, parentId, sourceId: s.sourceId, faith },
      update: { parentId, sourceId: s.sourceId },
    });
    subIds.set(s.sourceId, row.id);
  }
  console.log(`Categorias: ${catIds.size} principais, ${subIds.size} subcategorias`);

  const usedSlugs = new Set((await prisma.product.findMany({ select: { slug: true, sourceId: true } })).filter((p) => p.sourceId == null).map((p) => p.slug));
  const usedSkus = new Set<string>();
  let created = 0, updated = 0, images = 0, imgFail = 0;
  const problems: string[] = [];

  for (const p of src.products) {
    if (!p.name || p.price == null) {
      problems.push(`origem ${p.sourceId}: sem nome ou preço — não importado`);
      continue;
    }
    const name = cleanName(p.name, p.ref);
    let slug = slugify(`${name}${p.ref ? `-${p.ref}` : ""}`);
    while (usedSlugs.has(slug)) slug = `${slug}-${p.sourceId}`;
    usedSlugs.add(slug);
    const parent = p.categories[0] ? parentCode.get(p.categories[0].categorySourceId) : undefined;
    const material = p.material ? p.material[0].toUpperCase() + p.material.slice(1) : null;
    const karat = /18\s*(k|kilates|quilates)/i.test(`${p.material} ${p.name}`) ? "18k" : null;
    const specs = Object.entries(p.specs).map(([k, v]) => ({ label: LABELS[k] ?? k[0].toUpperCase() + k.slice(1), value: v }));
    const categoryIds = [...new Set([
      ...p.categories.flatMap((c) => [catIds.get(c.categorySourceId), subIds.get(c.subcategorySourceId)]),
      ...(p.parentCategories ?? []).map((c) => catIds.get(c)),
    ].filter(Boolean) as string[])];
    const price = cents(p.price)!;
    const sellsOnDemand = p.available !== false;

    const data = {
      name, ref: p.ref, description: p.description, specs, material, karat, color: p.color, stoneType: p.stones,
      weightG: p.weightG, lengthMm: p.dimensions.lengthMm, widthMm: p.dimensions.widthMm, thicknessMm: p.dimensions.thicknessMm,
      heightMm: p.dimensions.heightMm, diameterMm: p.dimensions.diameterMm, jewelryType: parent ? TYPE_BY_PARENT[parent] : null,
      priceCents: price, compareAtCents: p.compareAtPrice ? cents(p.compareAtPrice) : null,
      pixPriceCents: cents(p.pixPrice), maxInstallments: p.installments, optionName: p.optionName,
      sourceUrl: p.sourceUrl, primaryCategoryId: subIds.get(p.categories[0]?.subcategorySourceId) ?? catIds.get(p.categories[0]?.categorySourceId) ?? null,
    };
    const existing = await prisma.product.findUnique({ where: { sourceId: p.sourceId } });
    let productId: string;
    if (existing) {
      productId = existing.id;
      if (!keepEdits) await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      const sku = p.ref && !usedSkus.has(p.ref) && !(await prisma.product.findUnique({ where: { sku: p.ref } })) ? p.ref : null;
      const row = await prisma.product.create({
        data: { ...data, slug, sku, sourceId: p.sourceId, status: "ACTIVE", trackStock: !sellsOnDemand ? true : false, tags: [] },
      });
      productId = row.id;
      created++;
    }
    if (p.ref) usedSkus.add(p.ref);

    if (!existing || !keepEdits) {
      await prisma.productCategory.deleteMany({ where: { productId } });
      if (categoryIds.length) await prisma.productCategory.createMany({ data: categoryIds.map((categoryId) => ({ productId, categoryId })), skipDuplicates: true });
    }

    // variações
    const variants = p.variants.length ? p.variants : [{ sku: p.ref ?? `LX${p.sourceId}`, option: null, price: p.price, available: p.available }];
    const hasOptions = variants.some((v) => v.option);
    for (const [i, v] of variants.entries()) {
      const sku = hasOptions ? v.sku : v.sku || p.ref || `LX${p.sourceId}`;
      const vPrice = v.price != null && cents(v.price) !== price ? cents(v.price) : null;
      const owner = await prisma.productVariant.findUnique({ where: { sku } });
      const finalSku = owner && owner.productId !== productId ? `${sku}-${p.sourceId}` : sku;
      await prisma.productVariant.upsert({
        where: { sku: finalSku },
        create: { productId, sku: finalSku, option: hasOptions ? v.option : null, priceCents: vPrice, stock: 0, active: v.available !== false, position: i },
        update: keepEdits ? {} : { option: hasOptions ? v.option : null, priceCents: vPrice, active: v.available !== false, position: i },
      });
    }

    // vídeos
    if (p.videos.length && (!existing || !keepEdits)) {
      await prisma.productVideo.deleteMany({ where: { productId } });
      await prisma.productVideo.createMany({ data: p.videos.map((id, i) => ({ productId, url: `https://www.youtube.com/watch?v=${id}`, position: i })) });
    }

    // fotografias
    if (!skipImages) {
      const have = await prisma.productImage.count({ where: { productId } });
      if (!have) {
        for (const [i, rel] of (p.localImages ?? []).entries()) {
          const f = path.join(imgDir, rel);
          if (!existsSync(f)) {
            imgFail++;
            continue;
          }
          try {
            const st = await storeImage(readFileSync(f), `catalog/${p.ref ?? p.sourceId}`, String(i + 1));
            await prisma.productImage.create({ data: { productId, key: st.key, thumbKey: st.thumbKey, width: st.width, height: st.height, position: i, alt: `${name}${i ? ` — foto ${i + 1}` : ""}`, sourceUrl: p.images[i] } });
            images++;
          } catch (e) {
            imgFail++;
            problems.push(`origem ${p.sourceId} imagem ${rel}: ${(e as Error).message}`);
          }
        }
      }
    }
    if ((created + updated) % 100 === 0) console.log(`  ${created + updated}/${src.products.length}`);
  }
  console.log(`Produtos: ${created} criados, ${updated} atualizados · imagens: ${images} processadas, ${imgFail} falhas`);
  if (problems.length) console.log("Pendências:\n" + problems.slice(0, 50).join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
