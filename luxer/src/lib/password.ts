export const PASSWORD_RULES = "Mínimo de 12 caracteres, com letras maiúsculas, minúsculas, números e símbolo.";
export function passwordIsStrong(p: string): boolean {
  return p.length >= 12 && p.length <= 128 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);
}
