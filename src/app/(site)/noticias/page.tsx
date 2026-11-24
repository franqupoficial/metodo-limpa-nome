import type { Metadata } from "next";
import { NewsList } from "@/components/NewsList";

export const metadata: Metadata = { title: "Notícias e conteúdos", description: "Conteúdos educativos sobre direitos do consumidor, crédito, CPF, MEI, empreendedorismo, mobilidade e serviços digitais.", alternates: { canonical: "/noticias" } };
export const revalidate = 120;

export default async function Page({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina } = await searchParams;
  return <NewsList page={Number(pagina) || 1} />;
}
