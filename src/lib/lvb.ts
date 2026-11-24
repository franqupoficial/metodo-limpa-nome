import "server-only";
import type { PublicVehicle } from "./catalog";
import { getSetting, INCLUSION_LABEL } from "./settings";
import type { ClientPlanSettings, ClientVehicle } from "@/components/lvb/types";

export function toClientVehicle(v: PublicVehicle): ClientVehicle {
  return {
    id: v.id, slug: v.slug, name: v.name, brand: v.brand,
    categoryName: v.category.name, categorySlug: v.category.slug,
    monthlyCents: v.finalPriceCents!, kmPerMonth: v.kmPerMonth, terms: v.terms,
    imageUrl: v.imageUrl, imageCaption: v.imageCaption, features: v.features, conditions: v.conditions,
    protectionInfo: v.protectionInfo, maintenanceInfo: v.maintenanceInfo, availability: v.availability,
  };
}

export async function getClientPlanSettings(): Promise<ClientPlanSettings> {
  const [plans, inc, costs] = await Promise.all([getSetting("lvb.plans"), getSetting("lvb.inclusions"), getSetting("lvb.costs")]);
  return {
    termAdjustments: plans.termAdjustments,
    kmPackages: plans.kmPackages,
    priceNotice: plans.priceNotice,
    deliveryWindow: plans.deliveryWindow,
    inclusions: [
      { label: "Manutenção", status: INCLUSION_LABEL[inc.maintenance] },
      { label: "IPVA / licenciamento", status: INCLUSION_LABEL[inc.ipva] },
      { label: "Proteção / seguro", status: INCLUSION_LABEL[inc.insurance] },
      { label: "Assistência 24h", status: INCLUSION_LABEL[inc.assistance] },
    ],
    inclusionNotes: inc.notes,
    costs,
  };
}
