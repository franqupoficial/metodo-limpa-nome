import "server-only";
import { tryOnCategoryFor, REGION_OF } from "./ai/categories";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getSettings } from "./settings";
import { priceView, type PriceView } from "./pricing";
import { mediaUrl } from "./media-url";

export const visibleWhere = (): Prisma.ProductWhereInput => ({
  status: "ACTIVE",
  OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
});

export const cardSelect = {
  id: true, name: true, slug: true, ref: true, priceCents: true, compareAtCents: true, pixPriceCents: true,
  promoStartsAt: true, promoEndsAt: true, maxInstallments: true, isNew: true, bestSeller: true, trackStock: true,
  ratingAvg: true, ratingCount: true, material: true,
  images: { orderBy: { position: "asc" }, take: 2, select: { id: true, key: true, thumbKey: true, alt: true } },
  variants: { where: { active: true }, select: { stock: true, reserved: true } },
  // compatibilidade com o provador AR (categoria da peça → região do corpo)
  tryOnEnabled: true, jewelryType: true,
  categories: { select: { category: { select: { name: true } } } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  ref: string | null;
  image: string | null;
  hoverImage: string | null;
  alt: string;
  price: PriceView;
  available: boolean;
  isNew: boolean;
  bestSeller: boolean;
  rating: number | null;
  ratingCount: number;
  /** peça compatível com o provador AR (anel, pulseira, brinco, colar/corrente/pingente) */
  ar: boolean;
};

export async function toCards(rows: CardRow[]): Promise<ProductCard[]> {
  const s = await getSettings();
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    ref: p.ref,
    image: mediaUrl(p.images[0]?.thumbKey ?? p.images[0]?.key),
    hoverImage: mediaUrl(p.images[1]?.thumbKey ?? p.images[1]?.key),
    alt: p.images[0]?.alt || p.name,
    price: priceView(p, s.payment),
    available: !p.trackStock || s.stock.allowBackorder || p.variants.some((v) => v.stock - v.reserved > 0),
    isNew: p.isNew,
    bestSeller: p.bestSeller,
    rating: p.ratingAvg ? Number(p.ratingAvg) : null,
    ratingCount: p.ratingCount,
    ar: p.tryOnEnabled && Boolean(REGION_OF[tryOnCategoryFor(p.categories.map((c) => c.category.name).join(" ") + " " + (p.jewelryType ?? "") + " " + p.name) ?? ""]),
  }));
}

// ─────────── Busca ───────────

import { searchTokens } from "./search-tokens";
export { searchTokens };
export { normalize } from "./catalog-normalize";

/** IDs de produtos visíveis que casam com todos os termos (cada termo aceita sinônimos), ordenados por relevância. */
export async function searchIds(q: string, limit = 500): Promise<string[]> {
  const groups = searchTokens(q);
  if (!groups.length) return [];
  const doc = Prisma.sql`translate(lower(p."name" || ' ' || coalesce(p."ref",'') || ' ' || coalesce(p."sku",'') || ' ' || coalesce(p."material",'') || ' ' || coalesce(p."color",'') || ' ' || coalesce(p."stoneType",'') || ' ' || coalesce(p."jewelryType",'') || ' ' || array_to_string(p."tags", ' ') || ' ' || coalesce(p."description",'')), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')`;
  const name = Prisma.sql`translate(lower(p."name"), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')`;
  const conds = groups.map((alts) => Prisma.sql`(${Prisma.join(alts.map((a) => Prisma.sql`${doc} LIKE ${"%" + a + "%"}`), " OR ")})`);
  const score = Prisma.join(groups.flat().map((a) => Prisma.sql`(CASE WHEN ${name} LIKE ${"%" + a + "%"} THEN 2 ELSE 0 END)`), " + ");
  const exactRef = q.replace(/\D/g, "");
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p."id" FROM "Product" p
    WHERE p."status" = 'ACTIVE' AND (p."publishAt" IS NULL OR p."publishAt" <= now())
      AND ((${Prisma.join(conds, " AND ")}) OR (${exactRef.length >= 4} AND p."ref" = ${exactRef}))
    ORDER BY (CASE WHEN p."ref" = ${exactRef} THEN 100 ELSE 0 END) + ${score} DESC, p."salesCount" DESC, p."name" ASC
    LIMIT ${limit}`;
  return rows.map((r) => r.id);
}

// ─────────── Listagem ───────────

export type ListParams = {
  q?: string;
  categoryId?: string;
  categoryIds?: string[];
  collectionId?: string;
  faith?: boolean;
  min?: number;
  max?: number;
  material?: string;
  color?: string;
  stone?: string;
  available?: boolean;
  promo?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
  ids?: string[];
};

export const SORTS: Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }> = {
  relevancia: { label: "Relevância", orderBy: [{ featured: "desc" }, { salesCount: "desc" }, { createdAt: "desc" }] },
  "mais-vendidos": { label: "Mais vendidos", orderBy: [{ salesCount: "desc" }, { bestSeller: "desc" }] },
  novidades: { label: "Novidades", orderBy: [{ createdAt: "desc" }] },
  "menor-preco": { label: "Menor preço", orderBy: [{ priceCents: "asc" }] },
  "maior-preco": { label: "Maior preço", orderBy: [{ priceCents: "desc" }] },
  "a-z": { label: "Nome (A–Z)", orderBy: [{ name: "asc" }] },
};

export async function listProducts(p: ListParams) {
  const perPage = Math.min(p.perPage ?? 24, 60);
  const page = Math.max(1, p.page ?? 1);
  let ids = p.ids;
  if (p.q?.trim()) {
    const found = await searchIds(p.q);
    ids = ids ? ids.filter((i) => found.includes(i)) : found;
  }
  const where: Prisma.ProductWhereInput = {
    AND: [
      visibleWhere(),
      ids ? { id: { in: ids } } : {},
      p.categoryIds?.length ? { categories: { some: { categoryId: { in: p.categoryIds } } } } : {},
      p.categoryId ? { categories: { some: { categoryId: p.categoryId } } } : {},
      p.collectionId ? { collections: { some: { collectionId: p.collectionId } } } : {},
      p.faith ? { OR: [{ categories: { some: { category: { faith: true } } } }, { collections: { some: { collection: { faith: true } } } }] } : {},
      p.min != null ? { priceCents: { gte: p.min } } : {},
      p.max != null ? { priceCents: { lte: p.max } } : {},
      p.material ? { material: { contains: p.material, mode: "insensitive" } } : {},
      p.color ? { color: { contains: p.color, mode: "insensitive" } } : {},
      p.stone ? { stoneType: { contains: p.stone, mode: "insensitive" } } : {},
      p.promo ? { compareAtCents: { not: null } } : {},
      p.available ? { OR: [{ trackStock: false }, { variants: { some: { active: true, stock: { gt: 0 } } } }] } : {},
    ],
  };
  const sortKey = p.sort && SORTS[p.sort] ? p.sort : p.q ? "busca" : "relevancia";
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    sortKey === "busca" && ids
      ? prisma.product.findMany({ where, select: cardSelect }).then((r) => r.sort((a, b) => ids!.indexOf(a.id) - ids!.indexOf(b.id)).slice((page - 1) * perPage, page * perPage))
      : prisma.product.findMany({ where, select: cardSelect, orderBy: SORTS[sortKey].orderBy, skip: (page - 1) * perPage, take: perPage }),
  ]);
  return { total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)), items: await toCards(rows) };
}

/** Facetas (cores, pedras e faixa de preço) do conjunto filtrado por categoria. */
export async function facets(where: Prisma.ProductWhereInput) {
  const rows = await prisma.product.findMany({ where: { AND: [visibleWhere(), where] }, select: { color: true, stoneType: true, priceCents: true } });
  const count = (vals: (string | null)[]) => {
    const m = new Map<string, number>();
    for (const v of vals) {
      if (!v) continue;
      const k = v.split(/[,/]| com | e /i)[0].trim().replace(/\.$/, "");
      if (k.length < 2 || k.length > 30) continue;
      const label = k[0].toUpperCase() + k.slice(1).toLowerCase();
      m.set(label, (m.get(label) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  };
  const prices = rows.map((r) => r.priceCents).sort((a, b) => a - b);
  return { colors: count(rows.map((r) => r.color)), stones: count(rows.map((r) => r.stoneType)), minPrice: prices[0] ?? 0, maxPrice: prices.at(-1) ?? 0 };
}

export async function menuCategories() {
  return prisma.category.findMany({
    where: { active: true, showInMenu: true, parentId: null },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, faith: true, image: true, children: { where: { active: true, showInMenu: true }, orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } } },
  });
}
