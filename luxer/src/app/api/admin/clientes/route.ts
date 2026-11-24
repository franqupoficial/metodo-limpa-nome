import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { resolveSegment } from "@/lib/segment-resolve";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[;"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Exportação autorizada (customers.export). CPF nunca é exportado. Registrada na auditoria. */
export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin?.can("customers.export")) return new Response("Acesso negado", { status: 403 });
  const url = new URL(req.url);
  const seg = await resolveSegment(url.searchParams.get("segmento"));
  const rows = await prisma.customer.findMany({ where: { AND: [{ anonymizedAt: null }, seg?.where ?? {}] }, orderBy: { createdAt: "asc" } });
  const out = ["nome;email;telefone;pedidos;total_gasto;ultima_compra;aceita_marketing;cadastro"];
  for (const c of rows) out.push([c.name, c.email, c.phone, c.ordersCount, (c.totalSpentCents / 100).toFixed(2).replace(".", ","), c.lastOrderAt?.toISOString().slice(0, 10), c.marketingOptIn ? "sim" : "nao", c.createdAt.toISOString().slice(0, 10)].map(cell).join(";"));
  await audit(admin.id, "customer.export_csv", "Customer", undefined, { meta: { rows: rows.length, segment: seg?.name } });
  return new Response("﻿" + out.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="clientes-luxer-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
