/** Metais da LUXER em PBR (cor base aproximada da refletância real de cada liga). */
export type Metal = "amarelo" | "branco" | "rose";
export const METALS: Record<Metal, { label: string; short: string; color: string; swatch: string }> = {
  amarelo: { label: "Ouro Amarelo 18k", short: "Amarelo", color: "#f2c46d", swatch: "linear-gradient(135deg,#f6e3a6,#c9a24a 55%,#8a6a22)" },
  branco: { label: "Ouro Branco · Ródio", short: "Branco", color: "#e8e9ec", swatch: "linear-gradient(135deg,#ffffff,#c9ced6 55%,#8c939e)" },
  rose: { label: "Ouro Rosé 18k", short: "Rosé", color: "#efae94", swatch: "linear-gradient(135deg,#ffd9cc,#d5927c 55%,#9a5b49)" },
};
