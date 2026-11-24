import type { Metadata } from "next";
import Link from "next/link";
import { activeServices } from "@/lib/services";
import { getEnabledServices } from "@/lib/settings";
import { ServiceCard } from "@/components/ServiceCard";
import { Notice, PageHero, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Serviços",
  description: "Conheça os serviços digitais do Portal Consumidor: regularização de apontamentos no CPF, abertura de CNPJ e mais.",
  alternates: { canonical: "/servicos" },
};

export default async function ServicosPage() {
  const services = activeServices(await getEnabledServices());
  return (
    <>
      <PageHero eyebrow="Serviços" title="Serviços digitais" subtitle="Escolha o serviço, conheça as condições e contrate online." crumbs={[{ label: "Serviços" }]} />
      <Section>
        <div className="grid gap-5 sm:grid-cols-2">
          {services.map((s) => <ServiceCard key={s.type} s={s} cta="Conhecer e contratar" />)}
        </div>
        <p className="mt-8 text-sm text-muted">Já fez uma solicitação? <Link href="/acompanhar" className="font-semibold">Acompanhe aqui</Link>.</p>
      </Section>
    </>
  );
}
