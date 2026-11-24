import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { cardSelect, toCards, visibleWhere } from "./catalog";
import { getSettings } from "./settings";
import { providerConfigured } from "./ai/tryon";
import { tryOnCategoryFor } from "./ai/categories";
import { cutoutUrl } from "./cutout";

export const OCCASIONS = { presente: "Presente inesquecível", uso: "Uso pessoal & sofisticação", noivado: "Noivado & celebração", fe: "Fé & proteção" } as const;
export const METALS = { amarelo: "Ouro amarelo 18k", branco: "Ouro branco 18k", rose: "Ouro rosé", todos: "Todos os acabamentos" } as const;
export const PIECES = { aneis: "Anéis", brincos: "Brincos", colares: "Colares & pingentes", pulseiras: "Pulseiras", todas: "Curadoria completa" } as const;
export type Occasion = keyof typeof OCCASIONS;
export type Metal = keyof typeof METALS;
export type Piece = keyof typeof PIECES;

const PIECE_CATS: Record<Piece, string[]> = { aneis: ["aneis", "aliancas"], brincos: ["brincos"], colares: ["correntes-e-colares", "pingentes"], pulseiras: ["pulseiras", "tornozeleiras"], todas: [] };
const ENGAGEMENT = ["anel-solitario", "anel-de-diamante", "meia-alianca", "aliancas-de-ouro"];
const METAL_WHERE: Record<Metal, Prisma.ProductWhereInput> = {
  amarelo: { color: { contains: "amarelo", mode: "insensitive" } },
  branco: { OR: [{ color: { contains: "branco", mode: "insensitive" } }, { goldType: { contains: "branco", mode: "insensitive" } }] },
  rose: { OR: [{ color: { contains: "ros", mode: "insensitive" } }, { goldType: { contains: "ros", mode: "insensitive" } }] },
  todos: {},
};

function justify(p: { material: string | null; stoneType: string | null; weightG: unknown; color: string | null }, occasion: Occasion, metalMatched: boolean, metal: Metal) {
  const parts: string[] = [];
  parts.push({ presente: "Ideal para presentear", uso: "Elegância para o dia a dia", noivado: "Para celebrar o “sim”", fe: "Devoção em ouro" }[occasion]);
  if (/18/.test(p.material ?? "")) parts.push("Ouro 18k certificado");
  if (p.stoneType) parts.push(p.stoneType.replace(/\.$/, ""));
  if (p.weightG) parts.push(`${Number(p.weightG).toLocaleString("pt-BR")} g`);
  if (metal !== "todos" && !metalMatched && p.color) parts.push(`em ${p.color.toLowerCase()}`);
  return parts.slice(0, 3).join(" • ");
}

export async function curate(occasion: Occasion, metal: Metal, piece: Piece) {
  const s = await getSettings();
  const slugs = PIECE_CATS[piece];
  const cats = slugs.length ? await prisma.category.findMany({ where: { OR: [{ slug: { in: slugs } }, { parent: { slug: { in: slugs } } }] }, select: { id: true } }) : [];
  const base: Prisma.ProductWhereInput[] = [visibleWhere(), { images: { some: {} } }];
  if (cats.length) base.push({ categories: { some: { categoryId: { in: cats.map((c) => c.id) } } } });
  if (occasion === "fe") base.push({ categories: { some: { category: { faith: true } } } });
  if (occasion === "noivado" && (piece === "aneis" || piece === "todas")) base.push({ categories: { some: { category: { slug: { in: ENGAGEMENT } } } } });
  if (occasion === "presente") base.push({ priceCents: { gte: 150000 } });
  const order: Prisma.ProductOrderByWithRelationInput[] = [{ featured: "desc" }, { bestSeller: "desc" }, { salesCount: "desc" }, { ratingCount: "desc" }, { priceCents: occasion === "presente" || occasion === "noivado" ? "desc" : "asc" }];
  const sel = { ...cardSelect, color: true, stoneType: true, weightG: true, tryOnEnabled: true, jewelryType: true, categories: { select: { category: { select: { name: true } } } }, variants: { where: { active: true }, select: { id: true, option: true, stock: true, reserved: true } } } satisfies Prisma.ProductSelect;
  let rows = await prisma.product.findMany({ where: { AND: [...base, METAL_WHERE[metal]] }, orderBy: order, take: 6, select: sel });
  const matched = new Set(rows.map((r) => r.id));
  if (rows.length < 3) {
    // poucos resultados no metal escolhido: completa com outras peças e informa o acabamento real
    const more = await prisma.product.findMany({ where: { AND: [...base, { id: { notIn: [...matched] } }] }, orderBy: order, take: 6 - rows.length, select: sel });
    rows = [...rows, ...more];
  }
  const cards = await toCards(rows);
  const tryOnOn = s.ai.tryOnEnabled && providerConfigured(s.ai.provider);
  const cutouts = await Promise.all(rows.map((r) => (r.images[0] ? cutoutUrl(r.images[0].id) : null)));
  return rows.map((r, i) => {
    const cat = tryOnCategoryFor(r.categories.map((c) => c.category.name).join(" ") + " " + (r.jewelryType ?? "") + " " + r.name);
    const single = r.variants.length === 1 && !r.variants[0].option;
    return {
      ...cards[i],
      cutout: cutouts[i],
      why: justify(r, occasion, matched.has(r.id), metal),
      tryOn: Boolean(tryOnOn && r.tryOnEnabled && cat && s.ai.categories.includes(cat)),
      quickVariantId: single && cards[i].available ? r.variants[0].id : null,
    };
  });
}
