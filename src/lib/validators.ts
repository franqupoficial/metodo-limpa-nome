import { onlyDigits } from "./format";

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export function isValidPhone(value: string): boolean {
  const d = onlyDigits(value);
  return (d.length === 10 || d.length === 11) && !/^(\d)\1+$/.test(d);
}

export const isValidCep = (value: string) => onlyDigits(value).length === 8;

/** Idade em anos completos a partir de AAAA-MM-DD */
export function ageFrom(isoDate: string, now = new Date()): number {
  const d = new Date(isoDate + "T12:00:00");
  if (Number.isNaN(d.getTime())) return -1;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;
