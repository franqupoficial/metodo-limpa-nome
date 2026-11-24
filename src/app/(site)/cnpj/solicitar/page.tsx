import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { PageHero } from "@/components/ui";
import { CnpjForm } from "@/components/forms/CnpjForm";

export const metadata: Metadata = { title: "Solicitar abertura de CNPJ", alternates: { canonical: "/cnpj/solicitar" } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const { priceCents } = await getSetting("service.cnpj");
  return (
    <>
      <PageHero eyebrow="Abra seu CNPJ" title="Solicitação de formalização" subtitle="Preencha as 5 etapas. Você poderá revisar tudo antes de enviar." crumbs={[{ href: "/cnpj", label: "Abra seu CNPJ" }, { label: "Solicitar" }]} />
      <div className="container-portal py-10"><div className="card mx-auto max-w-3xl p-5 sm:p-8"><CnpjForm priceCents={priceCents} /></div></div>
    </>
  );
}
