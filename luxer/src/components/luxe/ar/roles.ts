import { findPair, type PieceImg } from "./draw";

/**
 * Usos que fazem sentido para as peças da foto: brinco para brincos e conjuntos; colar só se a peça tem colar/pingente (região do
 * colo, peça alongada na foto ou o nome diz); anel só num conjunto com uma peça compacta fora do par de brincos.
 * Nunca pendurar um anel como pingente nem oferecer "Colar" para um par de brincos.
 */
export function rolesFor(region: string, isSet: boolean, name: string, ps: PieceImg[]): ("ear" | "neck" | "hand")[] {
  const out: ("ear" | "neck" | "hand")[] = [];
  if (region === "ear" || (isSet && ps.some((p) => p.compact))) out.push("ear");
  if (region === "neck" || (isSet && (ps.some((p) => !p.compact) || /colar|gargantilha|pingente|corrente|choker/i.test(name)))) out.push("neck");
  if (isSet) {
    const pair = findPair(ps);
    // peça compacta que sobra fora do par de brincos (e o nome não fala de colar/pingente, que seriam essa peça)
    const extra = ps.some((p, i) => p.compact && !(pair ?? ([] as number[])).includes(i));
    if (/\banel\b/i.test(name) || (extra && !/colar|gargantilha|pingente|corrente/i.test(name))) out.push("hand");
  }
  return out;
}
