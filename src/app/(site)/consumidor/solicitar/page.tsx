import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { PageHero } from "@/components/ui";
import { ConsumidorForm } from "@/components/forms/ConsumidorForm";

export const metadata: Metadata = { title: "Contratar regularização de apontamentos", alternates: { canonical: "/consumidor/solicitar" } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const cfg = await getSetting("service.consumidor");
  return (
    <>
      <PageHero eyebrow="Consumidor" title="Contratar regularização de apontamentos" subtitle="Preencha as 4 etapas. Você revisa tudo antes de confirmar a contratação." crumbs={[{ href: "/consumidor", label: "Consumidor" }, { label: "Contratar" }]} />
      <div className="container-portal py-10">
        <div className="card mx-auto max-w-3xl p-5 sm:p-8"><ConsumidorForm {...cfg} /></div>
      </div>
    </>
  );
}
