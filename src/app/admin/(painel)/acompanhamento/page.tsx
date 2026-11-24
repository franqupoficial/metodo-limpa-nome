import Link from "next/link";
import { prisma } from "@/lib/db";
import { serviceMeta } from "@/lib/services";
import { ALL_STATUSES, statusDef } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { AdminHeader, Panel, Empty } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui";

export const metadata = { title: "Acompanhamento" };

export default async function Acompanhamento({ searchParams }: { searchParams: Promise<{ protocolo?: string }> }) {
  const { protocolo = "" } = await searchParams;
  const found = protocolo ? await prisma.serviceRequest.findUnique({ where: { protocol: protocolo.trim().toUpperCase() }, include: { customer: { select: { name: true } } } }) : null;
  const stale = await prisma.serviceRequest.findMany({
    where: { status: { in: ["RECEBIDO", "AGUARDANDO_DOCUMENTACAO"] }, updatedAt: { lt: new Date(Date.now() - 3 * 86_400_000) } },
    orderBy: { updatedAt: "asc" }, take: 20, include: { customer: { select: { name: true } } },
  });
  return (
    <>
      <AdminHeader title="Acompanhamento" subtitle="Localize protocolos, gere novos códigos de acesso e veja solicitações paradas." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Localizar protocolo">
          <form className="flex gap-2"><input name="protocolo" defaultValue={protocolo} className="input font-mono uppercase" placeholder="PC-XXX-AAAAMMDD-XXXXX" aria-label="Protocolo" /><button className="btn-primary">Buscar</button></form>
          {protocolo && (found ? (
            <div className="mt-4 rounded-lg border border-line p-4 text-sm">
              <p className="font-mono font-bold">{found.protocol}</p>
              <p>{found.customer.name} · {serviceMeta(found.service).short}</p>
              <p className="mt-1"><StatusBadge label={statusDef(found.status).label} tone={statusDef(found.status).tone} /></p>
              <Link href={`/admin/solicitacoes/${found.id}`} className="btn-secondary btn-sm mt-3">Abrir solicitação (status e código de acesso)</Link>
            </div>
          ) : <p className="mt-4 text-sm text-red-700">Protocolo não encontrado.</p>)}
        </Panel>
        <Panel title="Mensagens exibidas ao cliente por status">
          <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {ALL_STATUSES.map((s) => <li key={s.key}><StatusBadge label={s.label} tone={s.tone} /> <span className="text-muted">{s.nextSteps}</span></li>)}
          </ul>
        </Panel>
      </div>
      <Panel title="Sem movimentação há mais de 3 dias" className="mt-6">
        {stale.length ? (
          <table className="table-portal">
            <thead><tr><th>Protocolo</th><th>Cliente</th><th>Serviço</th><th>Status</th><th>Última atualização</th></tr></thead>
            <tbody>{stale.map((r) => <tr key={r.id}><td><Link href={`/admin/solicitacoes/${r.id}`} className="font-mono text-xs">{r.protocol}</Link></td><td>{r.customer.name}</td><td className="text-xs">{serviceMeta(r.service).short}</td><td><StatusBadge label={statusDef(r.status).label} tone={statusDef(r.status).tone} /></td><td className="text-xs">{formatDate(r.updatedAt, true)}</td></tr>)}</tbody>
          </table>
        ) : <Empty>Nenhuma solicitação parada.</Empty>}
      </Panel>
    </>
  );
}
