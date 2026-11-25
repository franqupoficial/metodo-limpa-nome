import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { visibleWhere } from "./catalog";
import { mediaUrl } from "./media-url";

/**
 * Especialização Luxer Fé — sempre derivada do catálogo real: só aparece a devoção que tem peça à venda.
 * Devoções = subcategorias marcadas como "fé" (Nossa Senhora, Cruz e Crucifixo, Santos…) e, além delas,
 * devoções que o catálogo traz no nome da peça (ex.: São Bento, Aparecida), buscadas dentro da Luxer Fé.
 */
export const FAITH_WHERE: Prisma.ProductWhereInput = { OR: [{ categories: { some: { category: { faith: true } } } }, { collections: { some: { collection: { faith: true } } } }] };

/** Devoções que existem como termo no nome das peças (sem categoria própria). Só entram com peças à venda. */
const NAMED: { label: string; q: string; match: string[] }[] = [
  { label: "São Bento", q: "São Bento", match: ["são bento", "sao bento"] },
  { label: "Nossa Senhora Aparecida", q: "Aparecida", match: ["aparecida"] },
  { label: "Nossa Senhora das Graças", q: "Graças", match: ["graças", "gracas"] },
  { label: "Nossa Senhora de Fátima", q: "Fátima", match: ["fátima", "fatima"] },
  { label: "São Jorge", q: "São Jorge", match: ["são jorge", "sao jorge"] },
];

export type Devotion = { label: string; href: string; count: number; image: string | null; kind: "category" | "named" };

async function coverFor(where: Prisma.ProductWhereInput) {
  const img = await prisma.productImage.findFirst({ where: { position: 0, product: { AND: [visibleWhere(), where] } }, orderBy: [{ product: { featured: "desc" } }, { product: { priceCents: "desc" } }], select: { thumbKey: true, key: true } });
  return mediaUrl(img?.thumbKey ?? img?.key ?? null);
}

export async function faithDevotions(opts: { images?: boolean } = {}): Promise<Devotion[]> {
  const cats = await prisma.category.findMany({ where: { faith: true, active: true, parent: { faith: true } }, orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true, image: true } });
  const out: Devotion[] = [];
  for (const c of cats) {
    const where: Prisma.ProductWhereInput = { categories: { some: { categoryId: c.id } } };
    const count = await prisma.product.count({ where: { AND: [visibleWhere(), where] } });
    if (!count) continue;
    out.push({ label: c.name, href: `/categoria/${c.slug}`, count, image: opts.images ? (c.image ? mediaUrl(c.image) : await coverFor(where)) : null, kind: "category" });
  }
  for (const n of NAMED) {
    const where: Prisma.ProductWhereInput = { AND: [FAITH_WHERE, { OR: n.match.map((m) => ({ name: { contains: m, mode: "insensitive" as const } })) }] };
    const count = await prisma.product.count({ where: { AND: [visibleWhere(), where] } });
    if (!count) continue;
    out.push({ label: n.label, href: `/luxer-fe?q=${encodeURIComponent(n.q)}`, count, image: opts.images ? await coverFor(where) : null, kind: "named" });
  }
  return out;
}

/** Peças religiosas por tipo (pingente, colar, anel, pulseira…): subcategorias "fé" dentro das categorias gerais. */
export async function faithPieceTypes() {
  const cats = await prisma.category.findMany({ where: { faith: true, active: true, parent: { faith: false } }, orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } });
  const out: { label: string; href: string; count: number }[] = [];
  for (const c of cats) {
    const count = await prisma.product.count({ where: { AND: [visibleWhere(), { categories: { some: { categoryId: c.id } } }] } });
    if (count) out.push({ label: c.name, href: `/categoria/${c.slug}`, count });
  }
  return out;
}

export async function faithTotal() {
  return prisma.product.count({ where: { AND: [visibleWhere(), FAITH_WHERE] } });
}
