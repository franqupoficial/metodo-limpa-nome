import type { Metadata } from "next";
import { LvbSubnav } from "@/components/lvb/LvbSubnav";
import { InstitutionalPage } from "@/components/InstitutionalPage";

export const metadata: Metadata = { title: "Políticas da locação LVB", description: "Termos de locação, cobrança, uso do veículo, quilometragem, manutenção, cobertura, devolução, cancelamento e demais informações.", alternates: { canonical: "/lvb/politicas" } };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <LvbSubnav current="/lvb/politicas" />
      <InstitutionalPage slug="lvb-politicas" tone="lvb" crumbs={[{ href: "/lvb", label: "LVB" }, { label: "Políticas" }]} />
    </>
  );
}
