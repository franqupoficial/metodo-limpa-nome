import { normalize } from "../catalog-normalize";

const LEAD: [RegExp, string][] = [
  [/^conjunto\b|^jogo\b(?!.*alianca)/, "conjuntos"], [/^(brinco|argola|ear cuff|piercing)/, "brincos"], [/^(anel|aneis|alianca|solitario)\b/, "aneis"],
  [/^(pulseira|bracelete)\b/, "pulseiras"], [/^tornozeleira\b/, ""], [/^(pingente|medalha|crucifixo|escapulario)\b/, "pingentes"],
  [/^(colar|gargantilha)/, "colares"], [/^corrente/, "correntes"],
];

/** Mapeia uma peça para a categoria do provador (por nome/categoria/tipo). */
export function tryOnCategoryFor(text: string, name?: string): string | null {
  // o substantivo que abre o nome manda: "Brinco Solitário de Pérola" é brinco, não anel
  const lead = name ? LEAD.find(([re]) => re.test(normalize(name).trim())) : undefined;
  if (lead) return lead[1] || null;
  const t = normalize(text);
  // conjuntos (colar + brincos etc.): o provador separa as peças da foto e o cliente escolhe qual provar
  if (/\bconjunto\b/.test(t)) return "conjuntos";
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
export const REGION_OF: Record<string, BodyRegion> = { conjuntos: "ear", aneis: "hand", brincos: "ear", colares: "neck", correntes: "neck", pingentes: "neck", pulseiras: "wrist" };
