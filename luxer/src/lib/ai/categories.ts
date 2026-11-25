import { normalize } from "../catalog-normalize";

/** Mapeia uma peça para a categoria do provador (por nome/categoria/tipo). */
export function tryOnCategoryFor(text: string): string | null {
  const t = normalize(text);
  if (/\b(anel|aneis|alianca|solitario|aparador)\b/.test(t)) return "aneis";
  if (/\bbrinco/.test(t)) return "brincos";
  // tornozeleiras ficam fora: o provador trabalha com mão, orelha, pescoço/colo e pulso
  if (/\btornozeleira\b/.test(t)) return null;
  if (/\b(pulseira|bracelete)\b/.test(t)) return "pulseiras";
  if (/\b(pingente|medalha|crucifixo|escapulario)\b/.test(t)) return "pingentes";
  if (/\bcolar|gargantilha/.test(t)) return "colares";
  if (/\bcorrente/.test(t)) return "correntes";
  return null;
}

/** Região do corpo usada pelo pipeline para cada categoria. */
export type BodyRegion = "hand" | "ear" | "neck" | "wrist";
export const REGION_OF: Record<string, BodyRegion> = { aneis: "hand", brincos: "ear", colares: "neck", correntes: "neck", pingentes: "neck", pulseiras: "wrist" };
