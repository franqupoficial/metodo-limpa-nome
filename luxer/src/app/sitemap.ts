import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/mail";
import { visibleWhere } from "@/lib/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const [products, cats, cols, pages] = await Promise.all([
    prisma.product.findMany({ where: visibleWhere(), select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    prisma.collection.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    prisma.page.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/luxer-fe`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/provador`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/perguntas-frequentes`, changeFrequency: "monthly", priority: 0.4 },
    ...cats.map((c) => ({ url: `${base}/categoria/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...cols.map((c) => ({ url: `${base}/colecao/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/produto/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...pages.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
