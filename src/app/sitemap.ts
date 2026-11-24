import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { NEWS_CATEGORIES } from "@/content/news-categories";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/$/, "");
  const statics = ["", "/servicos", "/consumidor", "/cnpj", "/emprestimo", "/emprestimo/como-funciona", "/lvb", "/lvb/veiculos", "/lvb/como-funciona", "/lvb/simulador", "/lvb/politicas", "/informacoes", "/perguntas-frequentes", "/noticias", "/privacidade", "/termos", "/contato"];
  const [news, vehicles] = await Promise.all([
    prisma.newsPost.findMany({ where: { published: true, publishedAt: { lte: new Date() } }, select: { slug: true, updatedAt: true } }),
    prisma.vehicle.findMany({ where: { active: true, priceValidatedAt: { not: null } }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 })),
    ...NEWS_CATEGORIES.map((c) => ({ url: `${base}/noticias/categoria/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...news.map((n) => ({ url: `${base}/noticias/${n.slug}`, lastModified: n.updatedAt, priority: 0.6 })),
    ...vehicles.map((v) => ({ url: `${base}/lvb/veiculos/${v.slug}`, lastModified: v.updatedAt, priority: 0.6 })),
  ];
}
