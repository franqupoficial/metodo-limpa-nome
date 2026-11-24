/**
 * Cria ou atualiza um usuário Proprietário e define a senha.
 * Uso: npm run admin:create-owner -- --email dono@luxerjoias.com.br --name "Nome"
 * A senha é pedida no terminal (ou lida de OWNER_PASSWORD para automação). Nunca é registrada em log.
 */
import { createInterface } from "node:readline/promises";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { passwordIsStrong, PASSWORD_RULES } from "../src/lib/password";

const arg = (k: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined);

async function main() {
  const email = (arg("--email") || process.env.OWNER_EMAIL || "").trim().toLowerCase();
  if (!email) throw new Error("Informe --email.");
  let password = process.env.OWNER_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Senha: ");
    rl.close();
  }
  if (!passwordIsStrong(password)) throw new Error(PASSWORD_RULES);
  const passwordHash = await bcrypt.hash(password, 12);
  const u = await prisma.adminUser.upsert({
    where: { email },
    create: { email, name: arg("--name") || "Proprietário", role: "OWNER", passwordHash },
    update: { passwordHash, role: "OWNER", active: true, failedLogins: 0, lockedUntil: null },
  });
  console.log(`Proprietário pronto: ${u.email}`);
}
main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
