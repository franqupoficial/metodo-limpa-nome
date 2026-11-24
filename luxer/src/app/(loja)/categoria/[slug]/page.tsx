import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CatalogView, PageTitle } from "@/components/site/CatalogView";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

async function load(slug: string) {
  return prisma.category.findFirst({ where: { slug, active: true }, include: { parent: true, children: { where: { active: true }, orderBy: [{ position: "asc" }, { name: "asc" }] } } });
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c) return {};
  return { title: c.seoTitle ?? c.name, description: c.seoDescription ?? c.description ?? `${c.name} em ouro 18k na Luxer Joias.`, alternates: { canonical: `/categoria/${c.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: P) {
  const { slug } = await params;
  const c = await load(slug);
  if (!c) notFound();
  const sp = await searchParams;
  const root = c.parent ?? c;
  const siblings = c.parent ? await prisma.category.findMany({ where: { parentId: c.parent.id, active: true }, orderBy: [{ position: "asc" }, { name: "asc" }] }) : c.children;
  return (
    <CatalogView
      base={`/categoria/${c.slug}`}
      sp={sp}
      params={{ categoryId: c.id }}
      facetWhere={{ categories: { some: { categoryId: c.id } } }}
      header={<PageTitle eyebrow={c.parent?.name ?? (c.faith ? "Luxer Fé" : "Joias Luxer")} title={c.name} text={c.description} dark={c.faith} />}
      subnav={siblings.length ? [{ name: `Todos — ${root.name}`, slug: root.slug, active: !c.parent }, ...siblings.map((s) => ({ name: s.name, slug: s.slug, active: s.id === c.id }))] : undefined}
    />
  );
}
