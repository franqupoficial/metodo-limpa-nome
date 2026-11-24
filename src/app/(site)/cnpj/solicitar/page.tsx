import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { PageHero } from "@/components/ui";
import { CnpjForm } from "@/components/forms/CnpjForm";

export const metadata: Metadata = { title: "Contratar abertura de CNPJ", alternates: { canonical: "/cnpj/solicitar" } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const { priceCents } = await getSetting("service.cnpj");
  return (
    <>
      <PageHero eyebrow="Abra seu CNPJ" title="Contratar abertura de CNPJ" subtitle="Preencha as 5 etapas. Você revisa tudo antes de confirmar." crumbs={[{ href: "/cnpj", label: "Abra seu CNPJ" }, { label: "Contratar" }]} />
      <div className="container-portal py-10"><div className="card mx-auto max-w-3xl p-5 sm:p-8"><CnpjForm priceCents={priceCents} /></div></div>
    </>
  );
}
