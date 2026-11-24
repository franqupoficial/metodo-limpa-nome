import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Notice } from "@/components/ui";
import { deleteVehicleAction, saveVehicleAction, toggleVehicleAction } from "../../../_actions/vehicles";

export const metadata = { title: "Editar veículo" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }) {
  const { id } = await params;
  const { criado } = await searchParams;
  const [v, categories] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id } }),
    prisma.vehicleCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!v) notFound();
  return (
    <>
      <AdminHeader back={{ href: "/admin/veiculos", label: "Veículos" }} title={`${v.brand} ${v.name}`} actions={v.priceValidatedAt && v.active ? <Link href={`/lvb/veiculos/${v.slug}`} target="_blank" className="btn-secondary btn-sm">Ver no site</Link> : undefined} />
      {criado && <div className="mb-4"><Notice tone="success">Veículo criado.</Notice></div>}
      <VehicleForm action={saveVehicleAction} vehicle={v} categories={categories} />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Panel title={v.active ? "Desativar" : "Ativar"}>
          <ActionForm action={toggleVehicleAction}><input type="hidden" name="id" value={v.id} /><Submit className="btn-secondary btn-sm">{v.active ? "Desativar veículo" : "Ativar veículo"}</Submit></ActionForm>
        </Panel>
        <Panel title="Excluir">
          <p className="mb-3 text-sm text-muted">Só é possível excluir veículos sem solicitações vinculadas.</p>
          <ActionForm action={deleteVehicleAction} confirm="Excluir este veículo definitivamente?"><input type="hidden" name="id" value={v.id} /><Submit className="btn-danger btn-sm" pendingText="Excluindo…">Excluir veículo</Submit></ActionForm>
        </Panel>
      </div>
    </>
  );
}
