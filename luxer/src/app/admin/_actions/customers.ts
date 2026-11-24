"use server";
import { revalidatePath } from "next/cache";
import { assertAdmin, ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit, diff } from "@/lib/audit";
import { randomToken } from "@/lib/crypto";
import { isValidEmail, onlyDigits } from "@/lib/validators";
import { bool, fail, int, money, ok, optStr, str, type ActionState } from "@/lib/action";

async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return fail(e.message);
    console.error(e);
    return fail(e instanceof Error ? e.message : "Erro inesperado.");
  }
}

export async function saveCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("customers.edit");
    const before = await prisma.customer.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    const email = str(fd, "email").toLowerCase();
    if (!isValidEmail(email)) return fail("E-mail inválido.");
    const optIn = bool(fd, "marketingOptIn");
    const after = await prisma.customer.update({
      where: { id: before.id },
      data: {
        name: str(fd, "name"), email, phone: onlyDigits(str(fd, "phone")) || null, notes: optStr(fd, "notes"),
        tags: str(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean),
        // o consentimento só pode ser REVOGADO pela equipe; conceder exige ação do próprio titular
        marketingOptIn: before.marketingOptIn && optIn, marketingOptAt: before.marketingOptIn && optIn ? before.marketingOptAt : before.marketingOptAt,
        whatsappOptIn: before.whatsappOptIn && bool(fd, "whatsappOptIn"),
      },
    });
    await audit(admin.id, "customer.update", "Customer", before.id, { changes: diff(before as never, after as never, ["updatedAt", "cpfEnc", "passwordHash"]) });
    revalidatePath(`/admin/clientes/${before.id}`);
    return ok("Cadastro atualizado.");
  });
}

/** LGPD: anonimiza dados pessoais preservando pedidos (obrigação fiscal), sem apagar o histórico financeiro. */
export async function anonymizeCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("customers.edit");
    if (!admin.can("customers.pii")) return fail("Somente quem tem acesso a dados pessoais pode anonimizar.");
    const c = await prisma.customer.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    const anon = `anonimo-${randomToken(6).toLowerCase()}@anonimizado.invalid`;
    await prisma.$transaction([
      prisma.customer.update({ where: { id: c.id }, data: { name: "Cliente anonimizado", email: anon, phone: null, cpfEnc: null, cpfHash: null, passwordHash: null, birthDate: null, notes: null, tags: [], marketingOptIn: false, whatsappOptIn: false, anonymizedAt: new Date() } }),
      prisma.customerAddress.deleteMany({ where: { customerId: c.id } }),
      prisma.customerSession.deleteMany({ where: { customerId: c.id } }),
      prisma.favorite.deleteMany({ where: { customerId: c.id } }),
      prisma.lead.deleteMany({ where: { email: c.email } }),
      prisma.review.updateMany({ where: { customerId: c.id }, data: { authorName: "Cliente" } }),
      prisma.cart.updateMany({ where: { customerId: c.id }, data: { email: null, name: null } }),
    ]);
    await audit(admin.id, "customer.anonymize", "Customer", c.id, { meta: { reason: str(fd, "reason") } });
    return ok("Dados pessoais anonimizados. Pedidos foram mantidos para fins fiscais.");
  });
}

export async function saveSegment(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("customers.view");
    const name = str(fd, "name");
    if (!name) return fail("Dê um nome ao segmento.");
    const rules = {
      minOrders: int(fd, "minOrders") ?? undefined, maxOrders: int(fd, "maxOrders") ?? undefined,
      minSpentCents: money(fd, "minSpent") ?? undefined, inactiveDays: int(fd, "inactiveDays") ?? undefined,
      sinceDays: int(fd, "sinceDays") ?? undefined, optIn: bool(fd, "optIn") || undefined,
      categoryIds: fd.getAll("categoryIds").map(String).filter(Boolean),
    };
    const id = str(fd, "id");
    const s = id ? await prisma.customerSegment.update({ where: { id }, data: { name, description: optStr(fd, "description"), rules } }) : await prisma.customerSegment.create({ data: { name, description: optStr(fd, "description"), rules } });
    await audit(admin.id, "segment.save", "CustomerSegment", s.id);
    return ok("Segmento salvo.", { redirect: `/admin/clientes?segmento=${s.id}` });
  });
}

export async function deleteSegment(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = await assertAdmin("customers.view");
    await prisma.customerSegment.delete({ where: { id: str(fd, "id") } });
    await audit(admin.id, "segment.delete", "CustomerSegment", str(fd, "id"));
    return ok("Segmento excluído.", { redirect: "/admin/clientes/segmentos" });
  });
}
