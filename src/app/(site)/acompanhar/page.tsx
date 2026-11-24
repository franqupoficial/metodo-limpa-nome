import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { TrackForm } from "@/components/TrackForm";

export const metadata: Metadata = { title: "Acompanhar solicitação", description: "Consulte o status da sua solicitação com o protocolo e o código de acesso.", alternates: { canonical: "/acompanhar" } };

export default async function Page({ searchParams }: { searchParams: Promise<{ protocolo?: string }> }) {
  const { protocolo } = await searchParams;
  return (
    <>
      <PageHero eyebrow="Acompanhamento" title="Acompanhar solicitação" subtitle="Informe o número de protocolo e o código de acesso recebidos ao concluir sua solicitação." crumbs={[{ label: "Acompanhar solicitação" }]} />
      <div className="container-portal py-10"><TrackForm initialProtocol={protocolo ?? ""} /></div>
    </>
  );
}
