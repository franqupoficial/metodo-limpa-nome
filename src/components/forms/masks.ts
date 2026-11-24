const d = (s: string) => s.replace(/\D/g, "");
export const maskCpfInput = (v: string) => {
  const x = d(v).slice(0, 11);
  return x.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
export const maskPhoneInput = (v: string) => {
  const x = d(v).slice(0, 11);
  if (x.length <= 2) return x.length ? `(${x}` : "";
  if (x.length <= 6) return `(${x.slice(0, 2)}) ${x.slice(2)}`;
  if (x.length <= 10) return `(${x.slice(0, 2)}) ${x.slice(2, 6)}-${x.slice(6)}`;
  return `(${x.slice(0, 2)}) ${x.slice(2, 7)}-${x.slice(7)}`;
};
export const maskCepInput = (v: string) => {
  const x = d(v).slice(0, 8);
  return x.length > 5 ? `${x.slice(0, 5)}-${x.slice(5)}` : x;
};
export const maskDigits = (max: number) => (v: string) => d(v).slice(0, max);
