import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, Empty } from "@/components/admin/ui";

export const metadata = { title: "Leads" };

export default async function Leads() {
  const admin = await requireAdmin("marketing.manage");
  const [rows, total, active] = await Promise.all([prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 300 }), prisma.lead.count(), prisma.lead.count({ where: { unsubscribedAt: null } })]);
  return (
    <>
      <PageHeader title="Leads e newsletter" subtitle={`${active} inscrito(s) ativo(s) de ${total}`} actions={admin.can("customers.export") && <a className="btn" href="/api/admin/leads">Exportar CSV</a>} />
      <Card pad={false}>{rows.length === 0 ? <Empty title="Nenhum lead ainda">Os inscritos da newsletter e dos pop-ups aparecem aqui.</Empty> : <div className="overflow-x-auto"><table className="tbl">
        <thead><tr><th>E-mail</th><th>Nome</th><th>Origem</th><th>Consentimento</th><th>Status</th></tr></thead>
        <tbody>{rows.map((l) => <tr key={l.id}><td>{l.email}</td><td>{l.name ?? "—"}</td><td className="text-xs">{l.source}</td><td className="text-xs">{formatDate(l.consentAt, true)}</td><td>{l.unsubscribedAt ? <Badge>Descadastrado</Badge> : <Badge tone="green">Ativo</Badge>}</td></tr>)}</tbody></table></div>}</Card>
    </>
  );
}
