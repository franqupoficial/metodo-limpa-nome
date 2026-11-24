/** Rateia o desconto entre as linhas para que a soma enviada ao gateway seja exatamente o total. */
export function allocate(lines: number[], discount: number): number[] {
  const total = lines.reduce((a, b) => a + b, 0);
  if (!total || !discount) return [...lines];
  let left = discount;
  return lines.map((l, i) => {
    const d = i === lines.length - 1 ? left : Math.min(left, Math.round((l / total) * discount));
    left -= d;
    return l - d;
  });
}
