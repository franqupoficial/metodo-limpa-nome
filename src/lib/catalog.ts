import "server-only";
import { prisma } from "./db";

/** Veículos publicáveis: ativos, categoria ativa e com preço validado pelo administrador. */
export async function getPublicVehicles() {
  return prisma.vehicle.findMany({
    where: { active: true, priceValidatedAt: { not: null }, finalPriceCents: { not: null }, category: { active: true } },
    include: { category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { finalPriceCents: "asc" }],
  });
}

export async function getPublicCategories() {
  const cats = await prisma.vehicleCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { vehicles: { where: { active: true, priceValidatedAt: { not: null } }, select: { finalPriceCents: true } } },
  });
  return cats.map((c) => {
    const prices = c.vehicles.map((v) => v.finalPriceCents ?? Infinity);
    const min = prices.length ? Math.min(...prices) : c.startingCents;
    return { ...c, fromCents: Number.isFinite(min) ? min : c.startingCents, vehicleCount: c.vehicles.length };
  });
}

export type PublicVehicle = Awaited<ReturnType<typeof getPublicVehicles>>[number];
