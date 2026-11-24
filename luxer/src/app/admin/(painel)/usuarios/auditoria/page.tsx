import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Pagination, qs } from "@/components/admin/ui";

export const metadata = { title: "Auditoria" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; usuario?: string; page?: string }> }) {
  await requireAdmin("audit.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { ...(sp.q ? { OR: [{ action: { contains: sp.q } }, { entity: { contains: sp.q } }, { entityId: sp.q }] } : {}), ...(sp.usuario ? { adminId: sp.usuario } : {}) };
  const [total, rows, users] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { admin: { select: { name: true } } } }),
    prisma.adminUser.findMany({ select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader title="Log de auditoria" back={{ href: "/admin/usuarios", label: "Usuários" }} subtitle="Registro imutável de quem fez o quê, quando e o que mudou." />
      <Card className="mb-4"><form className="flex flex-wrap gap-2"><input name="q" defaultValue={sp.q} placeholder="ação (ex.: product.update), entidade ou ID" className="input min-w-0 flex-1" />
        <select name="usuario" defaultValue={sp.usuario ?? ""} className="input !w-auto"><option value="">Todos os usuários</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select><button className="btn">Filtrar</button></form></Card>
      <Card pad={false}><div className="overflow-x-auto"><table className="tbl">
        <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Registro</th><th>Alterações</th><th>IP</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}><td className="whitespace-nowrap text-xs">{formatDate(r.createdAt, true)}</td><td className="text-xs">{r.admin?.name ?? "sistema"}</td><td className="font-mono text-xs">{r.action}</td>
            <td className="text-xs">{r.entity}{r.entityId ? <div className="font-mono text-[10px] text-zinc-400">{r.entityId}</div> : null}</td>
            <td className="max-w-md text-[11px]">{r.changes ? Object.entries(r.changes as Record<string, [unknown, unknown]>).slice(0, 6).map(([k, [a, b]]) => <div key={k}><b>{k}</b>: <span className="text-red-700 line-through">{String(a ?? "∅").slice(0, 40)}</span> → <span className="text-emerald-700">{String(b ?? "∅").slice(0, 40)}</span></div>) : r.meta ? <span className="text-zinc-500">{JSON.stringify(r.meta).slice(0, 160)}</span> : null}</td>
            <td className="font-mono text-[10px] text-zinc-400">{r.ip}</td></tr>
        ))}</tbody></table></div>
        <Pagination page={page} pages={Math.ceil(total / 50)} total={total} makeHref={(n) => `/admin/usuarios/auditoria${qs({ q: sp.q, usuario: sp.usuario }, { page: n })}`} />
      </Card>
    </>
  );
}
