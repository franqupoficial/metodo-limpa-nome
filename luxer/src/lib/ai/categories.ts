import { normalize } from "../catalog-normalize";

/** Mapeia uma peça para a categoria do provador (por nome/categoria/tipo). */
export function tryOnCategoryFor(text: string): string | null {
  const t = normalize(text);
  if (/\b(anel|aneis|alianca|solitario|aparador)\b/.test(t)) return "aneis";
  if (/\bbrinco/.test(t)) return "brincos";
  if (/\b(pulseira|bracelete|tornozeleira)\b/.test(t)) return "pulseiras";
  if (/\b(pingente|medalha|crucifixo|escapulario)\b/.test(t)) return "pingentes";
  if (/\bcolar|gargantilha/.test(t)) return "colares";
  if (/\bcorrente/.test(t)) return "correntes";
  return null;
}
