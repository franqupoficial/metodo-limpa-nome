import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin?.can("customers.export") || !admin.can("marketing.manage")) return new Response("Acesso negado", { status: 403 });
  const rows = await prisma.lead.findMany({ where: { unsubscribedAt: null }, orderBy: { createdAt: "asc" } });
  await audit(admin.id, "lead.export_csv", "Lead", undefined, { meta: { rows: rows.length } });
  return csvResponse("leads-luxer", "email;nome;origem;consentimento_em;texto_consentimento", rows.map((l) => [l.email, l.name, l.source, l.consentAt.toISOString(), l.consentText]));
}
