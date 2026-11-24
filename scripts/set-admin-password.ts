/**
 * Define (ou redefine) a senha de um administrador de forma interativa, sem gravá-la em código ou histórico.
 * Uso: npm run admin:set-password [-- email@dominio.com]
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "node:readline";

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
      out._writeToOutput = (s: string) => { if (s.includes(question)) out.output.write(s); else out.output.write("*"); };
    }
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(a); });
  });
}

const strong = (p: string) => p.length >= 12 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);

async function main() {
  const prisma = new PrismaClient();
  const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? (await ask("E-mail do administrador: "))).trim().toLowerCase();
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) { console.error(`Usuário ${email} não encontrado. Rode "npm run db:seed" com ADMIN_EMAIL definido.`); process.exit(1); }
  const p1 = await ask("Nova senha: ", true);
  if (!strong(p1)) { console.error("Senha fraca: mínimo de 12 caracteres, com maiúsculas, minúsculas, números e símbolo."); process.exit(1); }
  const p2 = await ask("Confirme a senha: ", true);
  if (p1 !== p2) { console.error("As senhas não conferem."); process.exit(1); }
  await prisma.adminUser.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(p1, 12), failedLogins: 0, lockedUntil: null, active: true } });
  await prisma.adminSession.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.create({ data: { adminId: user.id, action: "auth.password_set_cli" } });
  console.log(`Senha definida para ${email}.`);
  await prisma.$disconnect();
}
main();
