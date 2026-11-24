import Link from "next/link";
import type { ServiceType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SERVICES, serviceMeta } from "@/lib/services";
import { GROUP_LABEL, statusDef, statusesInGroup, type StatusGroup } from "@/lib/status";
import { formatDate, formatMoney } from "@/lib/format";
import { AdminHeader, Panel, Stat, Empty } from "@/components/admin/ui";
import { StatusBadge, Notice } from "@/components/ui";

export const metadata = { title: "Dashboard" };

const GROUP_TONE: Record<StatusGroup, "amber" | "brand" | "green" | "gray" | "red"> = { PENDENTE: "amber", EM_ANALISE: "brand", APROVADA: "green", FINALIZADA: "gray", RECUSADA: "red" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const admin = await requireAdmin();
  const { erro } = await searchParams;
  const since7 = new Date(Date.now() - 7 * 86_400_000);
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [customers, total, byService, byStatus, last7, last30, recent, pendingPrices, recentHistory] = await Promise.all([
    prisma.customer.count(),
    prisma.serviceRequest.count(),
    prisma.serviceRequest.groupBy({ by: ["service"], _count: true }),
    prisma.serviceRequest.groupBy({ by: ["status"], _count: true }),
    prisma.serviceRequest.count({ where: { createdAt: { gte: since7 } } }),
    prisma.serviceRequest.count({ where: { createdAt: { gte: since30 } } }),
    prisma.serviceRequest.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { customer: { select: { name: true } } } }),
    prisma.vehicle.count({ where: { suggestedCents: { not: null } } }),
    prisma.statusHistory.findMany({ where: { adminId: { not: null } }, orderBy: { createdAt: "desc" }, take: 8, include: { admin: { select: { name: true } }, request: { select: { protocol: true, id: true } } } }),
  ]);

  const svcCount = (t: ServiceType) => byService.find((b) => b.service === t)?._count ?? 0;
  const groupCount = (g: StatusGroup) => byStatus.filter((s) => statusesInGroup(g).includes(s.status)).reduce((a, b) => a + b._count, 0);
  const approved = groupCount("APROVADA") + groupCount("FINALIZADA");
  const decided = approved + groupCount("RECUSADA");
  const lvbPipeline = await prisma.serviceRequest.aggregate({ where: { service: "LVB", status: { in: statusesInGroup("APROVADA") } }, _sum: { monthlyCents: true } });

  return (
    <>
      <AdminHeader title={`Olá, ${admin.name.split(" ")[0]}`} subtitle="Visão geral das solicitações e indicadores do portal." />
      {erro === "permissao" && <div className="mb-4"><Notice tone="danger">Você não tem permissão para acessar aquela área.</Notice></div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total de clientes" value={customers} href="/admin/clientes" icon="users" />
        <Stat label="Total de solicitações" value={total} icon="doc" />
        <Stat label="Últimos 7 dias" value={last7} icon="calendar" tone="lvb" />
        <Stat label="Últimos 30 dias" value={last30} icon="calendar" tone="lvb" />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-muted">Por serviço</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((s) => <Stat key={s.type} label={`Solicitações — ${s.short}`} value={svcCount(s.type)} href={s.adminHref} icon={s.icon} tone={s.type === "LVB" ? "lvb" : "brand"} />)}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-muted">Por situação</h2>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(GROUP_LABEL) as StatusGroup[]).map((g) => <Stat key={g} label={GROUP_LABEL[g]} value={groupCount(g)} tone={GROUP_TONE[g]} />)}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Stat label="Taxa de aprovação (decididas)" value={decided ? `${Math.round((approved / decided) * 100)}%` : "—"} icon="gauge" tone="green" />
        <Stat label="LVB aprovadas — receita mensal prevista" value={formatMoney(lvbPipeline._sum.monthlyCents ?? 0)} icon="car" tone="lvb" />
        <Stat label="Preços aguardando validação" value={pendingPrices} href="/admin/tarifas#pendentes" icon="tag" tone={pendingPrices ? "amber" : "gray"} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Solicitações recentes">
          {recent.length ? (
            <ul className="divide-y divide-line">
              {recent.map((r) => {
                const st = statusDef(r.status);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <Link href={`/admin/solicitacoes/${r.id}`} className="font-mono text-xs font-semibold">{r.protocol}</Link>
                      <p className="truncate">{r.customer.name} · <span className="text-muted">{serviceMeta(r.service).short}</span></p>
                    </div>
                    <div className="text-right"><StatusBadge label={st.label} tone={st.tone} /><p className="mt-0.5 text-xs text-muted">{formatDate(r.createdAt, true)}</p></div>
                  </li>
                );
              })}
            </ul>
          ) : <Empty>Nenhuma solicitação ainda.</Empty>}
        </Panel>
        <Panel title="Atividades recentes da equipe">
          {recentHistory.length ? (
            <ul className="divide-y divide-line">
              {recentHistory.map((h) => (
                <li key={h.id} className="py-2.5 text-sm">
                  <p><strong>{h.admin?.name ?? "Sistema"}</strong> alterou <Link href={`/admin/solicitacoes/${h.request.id}`} className="font-mono text-xs">{h.request.protocol}</Link> para <strong>{statusDef(h.toStatus).label}</strong></p>
                  <p className="text-xs text-muted">{formatDate(h.createdAt, true)}</p>
                </li>
              ))}
            </ul>
          ) : <Empty>Nenhuma atividade registrada.</Empty>}
        </Panel>
      </div>
    </>
  );
}
