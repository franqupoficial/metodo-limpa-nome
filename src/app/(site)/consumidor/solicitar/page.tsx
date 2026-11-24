import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { PageHero } from "@/components/ui";
import { ConsumidorForm } from "@/components/forms/ConsumidorForm";

export const metadata: Metadata = { title: "Solicitar análise de apontamentos", alternates: { canonical: "/consumidor/solicitar" } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const cfg = await getSetting("service.consumidor");
  return (
    <>
      <PageHero eyebrow="Consumidor" title="Solicitar análise de apontamentos" subtitle="Preencha as etapas abaixo. Você poderá revisar tudo antes de enviar." crumbs={[{ href: "/consumidor", label: "Consumidor" }, { label: "Solicitar" }]} />
      <div className="container-portal py-10">
        <div className="card mx-auto max-w-3xl p-5 sm:p-8"><ConsumidorForm {...cfg} /></div>
      </div>
    </>
  );
}
