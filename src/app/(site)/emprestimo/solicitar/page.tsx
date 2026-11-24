import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { PageHero } from "@/components/ui";
import { EmprestimoForm } from "@/components/forms/EmprestimoForm";

export const metadata: Metadata = { title: "Solicitar empréstimo para negativados", alternates: { canonical: "/emprestimo/solicitar" } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const cfg = await getSetting("service.emprestimo");
  return (
    <>
      <PageHero eyebrow="Empréstimo" title="Empréstimo para negativados" subtitle="Cadastro em 4 etapas. Contrato por e-mail em até 24 horas após a aprovação." crumbs={[{ href: "/emprestimo", label: "Empréstimo" }, { label: "Solicitar" }]} />
      <div className="container-portal py-10"><div className="card mx-auto max-w-3xl p-5 sm:p-8"><EmprestimoForm minCents={cfg.minCents} maxCents={cfg.maxCents} /></div></div>
    </>
  );
}
