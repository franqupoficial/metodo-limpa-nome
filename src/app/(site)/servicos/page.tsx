import type { Metadata } from "next";
import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { ServiceCard } from "@/components/ServiceCard";
import { Notice, PageHero, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Serviços",
  description: "Conheça os serviços digitais do Portal Consumidor: análise de apontamentos no CPF, abertura de CNPJ, empréstimo e locação de veículos LVB.",
  alternates: { canonical: "/servicos" },
};

export default function ServicosPage() {
  return (
    <>
      <PageHero eyebrow="Serviços" title="Serviços digitais" subtitle="Escolha o serviço, conheça as informações e as condições e faça sua solicitação de forma organizada." crumbs={[{ label: "Serviços" }]} />
      <Section>
        <div className="grid gap-5 sm:grid-cols-2">
          {SERVICES.map((s) => <ServiceCard key={s.type} s={s} cta="Ver informações e solicitar" />)}
        </div>
        <div className="mt-8">
          <Notice tone="info" title="Plataforma privada">
            O Portal Consumidor é uma plataforma privada. Alguns serviços também podem ser realizados gratuitamente em canais públicos — indicamos essas alternativas em cada página. Já fez uma solicitação? <Link href="/acompanhar" className="font-semibold">Acompanhe aqui</Link>.
          </Notice>
        </div>
      </Section>
    </>
  );
}
