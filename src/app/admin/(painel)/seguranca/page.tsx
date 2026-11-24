import { prisma } from "@/lib/db";
import { requireAdmin, PASSWORD_RULES } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { AdminHeader, Panel, Pagination } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { changePasswordAction } from "../../_actions/auth";
import { createAdminUserAction, revokeSessionAction, updateAdminUserAction } from "../../_actions/security";

export const metadata = { title: "Segurança" };

export default async function Seguranca({ searchParams }: { searchParams: Promise<{ pagina?: string; acao?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const isAdmin = admin.role === "ADMIN";
  const page = Math.max(1, Number(sp.pagina) || 1);
  const auditWhere = { ...(isAdmin ? {} : { adminId: admin.id }), ...(sp.acao ? { action: { startsWith: sp.acao } } : {}) };
  const [sessions, users, logs, logCount] = await Promise.all([
    prisma.adminSession.findMany({ where: { ...(isAdmin ? {} : { userId: admin.id }), expiresAt: { gt: new Date() } }, include: { user: { select: { name: true, email: true } } }, orderBy: { lastSeenAt: "desc" } }),
    isAdmin ? prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }) : Promise.resolve([]),
    prisma.auditLog.findMany({ where: auditWhere, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { admin: { select: { name: true } } } }),
    prisma.auditLog.count({ where: auditWhere }),
  ]);

  return (
    <>
      <AdminHeader title="Segurança" subtitle="Senha, sessões, usuários e trilha de auditoria." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Alterar minha senha">
          <ActionForm action={changePasswordAction} resetOnSuccess className="space-y-3">
            <input name="current" type="password" autoComplete="current-password" required className="input" placeholder="Senha atual" aria-label="Senha atual" />
            <input name="password" type="password" autoComplete="new-password" required minLength={12} className="input" placeholder="Nova senha" aria-label="Nova senha" />
            <input name="confirm" type="password" autoComplete="new-password" required minLength={12} className="input" placeholder="Confirmar nova senha" aria-label="Confirmar nova senha" />
            <p className="hint">{PASSWORD_RULES}</p>
            <Submit>Alterar senha</Submit>
          </ActionForm>
        </Panel>
        <Panel title="Sessões ativas">
          <ul className="divide-y divide-line text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">{s.user.name} {s.id === admin.sessionId && <span className="badge bg-emerald-100 text-emerald-800">atual</span>}</p>
                  <p className="truncate text-xs text-muted">{s.ip} · {s.userAgent?.slice(0, 60)} · ativo {formatDate(s.lastSeenAt, true)}</p>
                </div>
                {s.id !== admin.sessionId && <ActionForm action={revokeSessionAction}><input type="hidden" name="id" value={s.id} /><Submit className="btn-ghost btn-sm" pendingText="…">Encerrar</Submit></ActionForm>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Sessões expiram após 8 horas ou 1 hora de inatividade.</p>
        </Panel>
      </div>

      {isAdmin && (
        <Panel title="Usuários do painel" className="mt-6">
          <div className="overflow-x-auto">
            <table className="table-portal min-w-[700px]">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th>Último acesso</th><th>Ações</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td><td className="text-xs">{u.email}</td>
                    <td className="text-xs">{u.role === "ADMIN" ? "Administrador" : "Operador"}</td>
                    <td className="text-xs">{!u.active ? "Inativo" : !u.passwordHash ? "Senha não definida" : u.lockedUntil && u.lockedUntil > new Date() ? "Bloqueado" : "Ativo"}</td>
                    <td className="text-xs">{formatDate(u.lastLoginAt, true)}</td>
                    <td className="flex flex-wrap gap-1">
                      {u.id !== admin.id && (["toggle", "role", "unlock"] as const).map((op) => (
                        <ActionForm key={op} action={updateAdminUserAction}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="op" value={op} /><Submit className="btn-ghost btn-sm" pendingText="…">{op === "toggle" ? (u.active ? "Desativar" : "Ativar") : op === "role" ? (u.role === "ADMIN" ? "Tornar operador" : "Tornar admin") : "Desbloquear"}</Submit></ActionForm>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ActionForm action={createAdminUserAction} resetOnSuccess className="mt-5 grid gap-2 rounded-lg border border-dashed border-line p-4 sm:grid-cols-4">
            <input name="name" required className="input" placeholder="Nome" aria-label="Nome" />
            <input name="email" type="email" required className="input" placeholder="E-mail" aria-label="E-mail" />
            <select name="role" className="input" aria-label="Perfil"><option value="OPERATOR">Operador</option><option value="ADMIN">Administrador</option></select>
            <Submit className="btn-primary">Convidar usuário</Submit>
          </ActionForm>
          <p className="mt-2 text-xs text-muted">Operadores gerenciam solicitações, veículos, tarifas e notícias. Administradores também acessam configurações, valores dos serviços, usuários e anonimização (LGPD).</p>
        </Panel>
      )}

      <Panel title="Trilha de auditoria" className="mt-6">
        <form className="mb-3 flex gap-2">
          <select name="acao" defaultValue={sp.acao ?? ""} className="input max-w-xs" aria-label="Filtrar ação">
            <option value="">Todas as ações</option>
            {["auth", "request", "customer", "document", "vehicle", "category", "news", "settings", "page", "admin_user"].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="btn-secondary btn-sm">Filtrar</button>
        </form>
        <div className="overflow-x-auto">
          <table className="table-portal min-w-[700px]">
            <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>IP</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}><td className="whitespace-nowrap text-xs">{formatDate(l.createdAt, true)}</td><td className="text-xs">{l.admin?.name ?? "—"}</td><td className="font-mono text-xs">{l.action}</td><td className="text-xs">{l.entity} {l.entityId?.slice(0, 12)}</td><td className="text-xs">{l.ip}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={Math.ceil(logCount / 50)} makeHref={(p) => `/admin/seguranca?${new URLSearchParams({ pagina: String(p), acao: sp.acao ?? "" })}`} />
      </Panel>
    </>
  );
}
