import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicVehicles } from "@/lib/catalog";
import { getClientPlanSettings, toClientVehicle } from "@/lib/lvb";
import { formatMoney } from "@/lib/format";
import { LvbSubnav } from "@/components/lvb/LvbSubnav";
import { VehicleImage } from "@/components/lvb/VehicleImage";
import { Simulator } from "@/components/lvb/Simulator";
import { AVAILABILITY_LABEL } from "@/components/lvb/types";
import { Breadcrumbs, Notice } from "@/components/ui";
import { Icon } from "@/components/Icon";

async function load(slug: string) {
  return prisma.vehicle.findFirst({ where: { slug, active: true, priceValidatedAt: { not: null }, finalPriceCents: { not: null }, category: { active: true } }, include: { category: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const v = await load((await params).slug);
  if (!v) return { title: "Veículo não encontrado" };
  return { title: `${v.brand} ${v.name} — Locação LVB`, description: `${v.category.name}: ${v.description.slice(0, 150)}`, alternates: { canonical: `/lvb/veiculos/${v.slug}` } };
}

export default async function VehiclePage({ params }: { params: Promise<{ slug: string }> }) {
  const v = await load((await params).slug);
  if (!v) notFound();
  const [all, settings] = await Promise.all([getPublicVehicles(), getClientPlanSettings()]);
  const cv = toClientVehicle(v);
  return (
    <>
      <LvbSubnav current="/lvb/veiculos" />
      <div className="container-portal py-8">
        <Breadcrumbs items={[{ href: "/lvb", label: "LVB" }, { href: "/lvb/veiculos", label: "Catálogo" }, { label: `${v.brand} ${v.name}` }]} />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <VehicleImage url={v.imageUrl} category={v.category.name} caption={v.imageCaption} className="aspect-[16/10] rounded-2xl" />
          <div>
            <span className="badge bg-lvb-50 text-lvb-700">{v.category.name}</span>
            <h1 className="mt-3 text-3xl font-extrabold">{v.brand} {v.name}</h1>
            <p className="mt-1 text-sm text-muted">{AVAILABILITY_LABEL[v.availability]}</p>
            <p className="mt-5 text-sm text-muted">Valor mensal a partir de</p>
            <p className="text-4xl font-extrabold text-lvb-700">{formatMoney(v.finalPriceCents)}<span className="text-base font-medium text-muted">/mês</span></p>
            <p className="mt-4 leading-relaxed">{v.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-surface p-3"><dt className="text-xs text-muted">Prazos disponíveis</dt><dd className="font-semibold">{v.terms.join(", ")} meses</dd></div>
              <div className="rounded-lg bg-surface p-3"><dt className="text-xs text-muted">Quilometragem contratada</dt><dd className="font-semibold">{v.kmPerMonth.toLocaleString("pt-BR")} km/mês</dd></div>
            </dl>
            {v.availability !== "UNAVAILABLE" && <Link href={`/lvb/solicitar?veiculo=${v.slug}`} className="btn-lvb mt-6 w-full sm:w-auto">Solicitar locação</Link>}
          </div>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="card p-6">
            <h2 className="text-lg font-bold">Características</h2>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{v.features.map((f) => <li key={f} className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-lvb-600" />{f}</li>)}</ul>
          </section>
          <section className="card p-6">
            <h2 className="text-lg font-bold">Condições</h2>
            <p className="mt-3 whitespace-pre-line text-sm text-muted">{v.conditions || "As condições completas são apresentadas na proposta, antes da contratação."}</p>
            {v.maintenanceInfo && <p className="mt-3 text-sm"><strong>Manutenção:</strong> {v.maintenanceInfo}</p>}
            {v.protectionInfo && <p className="mt-1 text-sm"><strong>Proteção:</strong> {v.protectionInfo}</p>}
            <ul className="mt-3 space-y-1 text-sm">{settings.inclusions.map((i) => <li key={i.label} className="flex justify-between"><span>{i.label}</span><span className="font-semibold">{i.status}</span></li>)}</ul>
          </section>
        </div>
        <section className="mt-10">
          <h2 className="mb-5 text-2xl font-bold">Simule este veículo</h2>
          <Simulator vehicles={all.map(toClientVehicle)} settings={settings} initialVehicleId={cv.id} />
        </section>
        <div className="mt-8"><Notice tone="info">{v.imageCaption}. O modelo pode ser substituído por similar da mesma categoria. Disponibilidade confirmada após a análise da solicitação.</Notice></div>
      </div>
    </>
  );
}
