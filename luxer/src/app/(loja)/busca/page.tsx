import type { Metadata } from "next";
import { CatalogView, PageTitle } from "@/components/site/CatalogView";

export const metadata: Metadata = { title: "Busca", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const title = q ? `“${q}”` : sp.ordem === "novidades" ? "Novidades" : sp.ordem === "mais-vendidos" ? "Mais vendidos" : "Todas as joias";
  return <CatalogView base="/busca" sp={{ ...sp, q }} params={{ q }} facetWhere={{}} header={<PageTitle eyebrow={q ? "Resultados da busca" : "Catálogo"} title={title} />} />;
}
