import type { Metadata } from "next";
import { getPublicVehicles } from "@/lib/catalog";
import { getClientPlanSettings, toClientVehicle } from "@/lib/lvb";
import { LvbSubnav } from "@/components/lvb/LvbSubnav";
import { LvbForm } from "@/components/lvb/LvbForm";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Solicitar locação LVB", alternates: { canonical: "/lvb/solicitar" } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [vehicles, settings] = await Promise.all([getPublicVehicles(), getClientPlanSettings()]);
  const cv = vehicles.filter((v) => v.availability !== "UNAVAILABLE").map(toClientVehicle);
  const pre = cv.find((v) => v.slug === sp.veiculo);
  const term = Number(sp.prazo);
  return (
    <>
      <LvbSubnav current="/lvb/solicitar" />
      <PageHero tone="lvb" eyebrow="LVB" title="Solicitação de locação" subtitle="7 etapas. Você revisa tudo antes de enviar. Nenhum pagamento é solicitado agora." crumbs={[{ href: "/lvb", label: "LVB" }, { label: "Solicitar" }]} />
      <div className="container-portal py-10">
        <div className="card mx-auto max-w-3xl p-5 sm:p-8">
          {cv.length ? <LvbForm vehicles={cv} settings={settings} initial={{ vehicleId: pre?.id, term: [12, 24, 36].includes(term) ? term : undefined, km: sp.km }} /> : <p className="text-center text-muted">No momento não há veículos disponíveis para solicitação.</p>}
        </div>
      </div>
    </>
  );
}
