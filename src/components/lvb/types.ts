import type { KmPackage, TermAdjustments } from "@/lib/pricing";

export interface ClientVehicle {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categoryName: string;
  categorySlug: string;
  monthlyCents: number;
  kmPerMonth: number;
  terms: number[];
  imageUrl: string | null;
  imageCaption: string;
  features: string[];
  conditions: string;
  protectionInfo: string | null;
  maintenanceInfo: string | null;
  availability: "AVAILABLE" | "ON_REQUEST" | "UNAVAILABLE";
}

export interface ClientPlanSettings {
  termAdjustments: TermAdjustments;
  kmPackages: KmPackage[];
  priceNotice: string;
  inclusions: { label: string; status: string }[];
  inclusionNotes: string;
  costs: { label: string; description: string }[];
}

export const AVAILABILITY_LABEL = {
  AVAILABLE: "Disponível para reserva",
  ON_REQUEST: "Reserva confirmada na contratação",
  UNAVAILABLE: "Indisponível no momento",
} as const;
