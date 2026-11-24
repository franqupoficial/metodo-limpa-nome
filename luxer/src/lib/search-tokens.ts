import { normalize } from "./catalog-normalize";

export const SYNONYMS: Record<string, string[]> = {
  colar: ["colar", "corrente", "gargantilha"],
  corrente: ["corrente", "colar"],
  diamante: ["diamante", "brilhante"],
  brilhante: ["brilhante", "diamante"],
  alianca: ["alianca", "aliancas"],
  anel: ["anel", "aneis", "solitario"],
  aneis: ["anel", "aneis"],
  brinco: ["brinco", "brincos", "argola"],
  pulseira: ["pulseira", "bracelete"],
  pingente: ["pingente", "medalha"],
  medalha: ["medalha", "pingente"],
  ouro: ["ouro"],
  "18k": ["18 kilates", "18k", "18 quilates"],
  religioso: ["religios", "santo", "santa", "cruz", "crucifixo", "nossa senhora", "espirito santo", "terco", "escapulario"],
  fe: ["religios", "santo", "santa", "cruz", "crucifixo", "nossa senhora", "espirito santo"],
  zirconia: ["zirconia", "zirconias"],
  perola: ["perola", "perolas"],
};


export function searchTokens(q: string): string[][] {
  const STOP = new Set(["de", "da", "do", "em", "com", "e", "para", "a", "o", "as", "os"]);
  return normalize(q)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .slice(0, 8)
    .map((t) => SYNONYMS[t] ?? (t.endsWith("s") && t.length > 4 ? [t, t.slice(0, -1)] : [t]));
}

