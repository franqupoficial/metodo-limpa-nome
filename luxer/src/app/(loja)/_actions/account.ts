"use server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { customerLogin, customerLogout, startCustomerSession, getCustomer, customerPasswordOk, CUSTOMER_PASSWORD_RULES, createCustomerToken, consumeCustomerToken } from "@/lib/customer-auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-meta";
import { sendMail, appUrl } from "@/lib/mail";
import { isValidEmail, onlyDigits, UFS } from "@/lib/validators";
import { notify } from "@/lib/notifications";
import { bool, fail, ok, str, type ActionState } from "@/lib/action";

const safeBack = (v: string) => (v.startsWith("/") && !v.startsWith("//") ? v : "/conta");

export async function loginCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const email = str(fd, "email").toLowerCase();
  if (!(await rateLimit(`cust-login:${ip}`, 20, 900)) || !(await rateLimit(`cust-login:${email}`, 8, 900))) return fail("Muitas tentativas. Aguarde 15 minutos.");
  const c = await customerLogin(email, str(fd, "password"));
  if (!c) return fail("E-mail ou senha incorretos.");
  await resetRateLimit(`cust-login:${email}`);
  redirect(safeBack(str(fd, "voltar")));
}

export async function registerCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`cust-register:${ip}`, 5, 3600))) return fail("Muitas tentativas. Tente mais tarde.");
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name");
  const password = str(fd, "password");
  if (name.length < 3) return fail("Informe seu nome.");
  if (!isValidEmail(email)) return fail("E-mail inválido.");
  if (!customerPasswordOk(password)) return fail(CUSTOMER_PASSWORD_RULES);
  if (!bool(fd, "terms")) return fail("Aceite a política de privacidade.");
  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing?.passwordHash) return fail("Este e-mail já tem conta. Entre ou recupere a senha.");
  const hash = await bcrypt.hash(password, 12);
  const opt = bool(fd, "marketing") ? { marketingOptIn: true, marketingOptAt: new Date() } : {};
  // compras anteriores como visitante são vinculadas à conta pelo mesmo e-mail
  const c = existing
    ? await prisma.customer.update({ where: { id: existing.id }, data: { name, passwordHash: hash, phone: onlyDigits(str(fd, "phone")) || existing.phone, ...opt } })
    : await prisma.customer.create({ data: { email, name, passwordHash: hash, phone: onlyDigits(str(fd, "phone")) || null, ...opt } });
  await startCustomerSession(c.id);
  redirect(safeBack(str(fd, "voltar")));
}

export async function logoutCustomer() {
  await customerLogout();
  redirect("/");
}

export async function forgotCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit(`cust-forgot:${await clientIp()}`, 5, 3600))) return fail("Muitas solicitações.");
  const c = await prisma.customer.findUnique({ where: { email: str(fd, "email").toLowerCase() } });
  if (c && !c.anonymizedAt) {
    const t = await createCustomerToken(c.id, "reset");
    await sendMail({ to: c.email, template: "customer.reset", subject: "Redefinição de senha — Luxer Joias", title: "Redefinir sua senha", paragraphs: ["Recebemos um pedido para redefinir a senha da sua conta.", "O link vale por 1 hora. Se não foi você, ignore este e-mail."], cta: { label: "Criar nova senha", url: `${appUrl()}/conta/redefinir?t=${t}` } });
  }
  return ok("Se houver uma conta com este e-mail, você receberá o link em instantes.");
}

export async function resetCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  const p = str(fd, "password");
  if (!customerPasswordOk(p)) return fail(CUSTOMER_PASSWORD_RULES);
  const id = await consumeCustomerToken(str(fd, "t"), "reset");
  if (!id) return fail("Link inválido ou expirado.");
  await prisma.customer.update({ where: { id }, data: { passwordHash: await bcrypt.hash(p, 12) } });
  await prisma.customerSession.deleteMany({ where: { customerId: id } });
  await startCustomerSession(id);
  return ok("Senha alterada.", { redirect: "/conta" });
}

async function me() {
  const c = await getCustomer();
  if (!c) redirect("/conta/entrar");
  return c;
}

export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const c = await me();
  const name = str(fd, "name");
  if (name.length < 3) return fail("Informe seu nome.");
  const wantMk = bool(fd, "marketing");
  await prisma.customer.update({
    where: { id: c.id },
    data: { name, phone: onlyDigits(str(fd, "phone")) || null, marketingOptIn: wantMk, marketingOptAt: wantMk && !c.marketingOptIn ? new Date() : c.marketingOptAt, whatsappOptIn: bool(fd, "whatsapp") },
  });
  if (!wantMk) await prisma.lead.updateMany({ where: { email: c.email }, data: { unsubscribedAt: new Date() } });
  return ok("Dados atualizados.");
}

export async function saveAddress(_: ActionState, fd: FormData): Promise<ActionState> {
  const c = await me();
  const data = { label: str(fd, "label") || null, recipient: str(fd, "recipient") || c.name, postalCode: onlyDigits(str(fd, "postalCode")), street: str(fd, "street"), number: str(fd, "number"), complement: str(fd, "complement") || null, district: str(fd, "district"), city: str(fd, "city"), state: str(fd, "state").toUpperCase() };
  if (data.postalCode.length !== 8 || !data.street || !data.number || !data.district || !data.city || !UFS.includes(data.state)) return fail("Preencha o endereço completo.");
  const id = str(fd, "id");
  if (id) await prisma.customerAddress.updateMany({ where: { id, customerId: c.id }, data });
  else await prisma.customerAddress.create({ data: { ...data, customerId: c.id, isDefault: !(await prisma.customerAddress.count({ where: { customerId: c.id } })) } });
  return ok("Endereço salvo.");
}

export async function addressOp(_: ActionState, fd: FormData): Promise<ActionState> {
  const c = await me();
  const id = str(fd, "id");
  if (str(fd, "op") === "delete") await prisma.customerAddress.deleteMany({ where: { id, customerId: c.id } });
  else {
    await prisma.customerAddress.updateMany({ where: { customerId: c.id }, data: { isDefault: false } });
    await prisma.customerAddress.updateMany({ where: { id, customerId: c.id }, data: { isDefault: true } });
  }
  return ok("Endereços atualizados.");
}

/** LGPD: solicitação de exclusão — a equipe executa a anonimização (pedidos são mantidos pelo prazo fiscal). */
export async function requestDeletion(_: ActionState, fd: FormData): Promise<ActionState> {
  const c = await me();
  if (str(fd, "confirm") !== "EXCLUIR") return fail("Digite EXCLUIR para confirmar.");
  await notify("system", "Solicitação LGPD de exclusão de dados", `${c.name} (${c.email}) pediu a exclusão dos dados pessoais.`, `/admin/clientes/${c.id}`);
  await sendMail({ to: c.email, template: "customer.deletion", subject: "Recebemos sua solicitação de exclusão de dados", title: "Solicitação recebida", paragraphs: ["Recebemos seu pedido de exclusão de dados pessoais. Ele será atendido em até 15 dias.", "Pedidos e notas fiscais são mantidos pelo prazo exigido pela legislação fiscal, sem uso para outras finalidades."] });
  return ok("Solicitação registrada. Você receberá a confirmação por e-mail.");
}
