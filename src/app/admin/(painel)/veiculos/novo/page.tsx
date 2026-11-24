import { prisma } from "@/lib/db";
import { AdminHeader } from "@/components/admin/ui";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { saveVehicleAction } from "../../../_actions/vehicles";

export const metadata = { title: "Novo veículo" };

export default async function Page() {
  const categories = await prisma.vehicleCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <AdminHeader back={{ href: "/admin/veiculos", label: "Veículos" }} title="Adicionar veículo" />
      <VehicleForm action={saveVehicleAction} categories={categories} />
    </>
  );
}
