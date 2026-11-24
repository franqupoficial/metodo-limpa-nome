import type { Metadata } from "next";
import { getPublicVehicles } from "@/lib/catalog";
import { getClientPlanSettings, toClientVehicle } from "@/lib/lvb";
import { LvbSubnav } from "@/components/lvb/LvbSubnav";
import { Simulator } from "@/components/lvb/Simulator";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Simulador de locação LVB", description: "Simule o valor mensal, a primeira parcela e o total estimado do seu plano de locação.", alternates: { canonical: "/lvb/simulador" } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const [vehicles, settings] = await Promise.all([getPublicVehicles(), getClientPlanSettings()]);
  return (
    <>
      <LvbSubnav current="/lvb/simulador" />
      <PageHero tone="lvb" eyebrow="LVB" title="Simulador de plano" subtitle="Valores calculados automaticamente, sem custos ocultos. Custos adicionais aplicáveis são listados abaixo do resultado." crumbs={[{ href: "/lvb", label: "LVB" }, { label: "Simulador" }]} />
      <div className="container-portal py-10"><Simulator vehicles={vehicles.map(toClientVehicle)} settings={settings} /></div>
    </>
  );
}
