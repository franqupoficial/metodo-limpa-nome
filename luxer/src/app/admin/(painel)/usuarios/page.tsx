import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PERMISSIONS, ROLE_LABEL, ROLE_PERMISSIONS, type Permission } from "@/lib/permissions";
import { PageHeader, Card, Badge, Field } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/forms";
import { saveAdminUser } from "../../_actions/admin-misc";

export const metadata = { title: "Usuários" };

export default async function Users({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string }> }) {
  const admin = await requireAdmin("users.manage");
  const { editar, novo } = await searchParams;
  const users = await prisma.adminUser.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const u = editar ? users.find((x) => x.id === editar) : null;
  const perms = Object.entries(PERMISSIONS) as [Permission, string][];
  return (
    <>
      <PageHeader title="Usuários e permissões" actions={<><Link className="btn" href="/admin/usuarios/auditoria">Log de auditoria</Link><Link className="btn btn-primary" href="?novo=1">+ Novo usuário</Link></>} />
      <div className={`grid gap-5 ${u || novo ? "xl:grid-cols-[1fr_520px]" : ""}`}>
        <Card pad={false}><table className="tbl"><thead><tr><th>Usuário</th><th>Perfil</th><th>Último acesso</th><th>Status</th><th /></tr></thead><tbody>
          {users.map((x) => <tr key={x.id}><td className="font-medium">{x.name}<div className="text-[11px] text-zinc-500">{x.email}</div></td><td>{ROLE_LABEL[x.role]}{(x.grants.length > 0 || x.denies.length > 0) && <div className="text-[11px] text-zinc-500">+{x.grants.length} / −{x.denies.length} ajustes</div>}</td>
            <td className="text-xs">{x.lastLoginAt ? formatDate(x.lastLoginAt, true) : "nunca"}</td><td>{x.active ? <Badge tone="green">Ativo</Badge> : <Badge>Inativo</Badge>}{!x.passwordHash && <Badge tone="amber">sem senha</Badge>}</td>
            <td className="text-right"><Link className="btn !py-1 text-xs" href={`?editar=${x.id}`}>Editar</Link></td></tr>)}
        </tbody></table></Card>
        {(u || novo) && (
          <Card title={u ? `Editar ${u.name}` : "Novo usuário"}>
            <ActionForm action={saveAdminUser} className="space-y-3" key={u?.id ?? "new"}>
              {u && <input type="hidden" name="id" value={u.id} />}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome"><input name="name" defaultValue={u?.name} required className="input" /></Field>
                <Field label="E-mail"><input name="email" type="email" defaultValue={u?.email} required className="input" /></Field>
                <Field label="Perfil"><select name="role" defaultValue={u?.role ?? "OPERATOR"} className="input">{Object.entries(ROLE_LABEL).filter(([k]) => k !== "OWNER" || admin.role === "OWNER").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="active" defaultChecked={u?.active ?? true} /> Ativo</label>
              </div>
              <div>
                <div className="lbl">Ajuste fino de permissões</div>
                <p className="mb-2 text-[11px] text-zinc-500">O perfil define o padrão. Marque “conceder” para dar uma permissão extra ou “retirar” para remover uma do perfil. Verificado no servidor em toda operação.</p>
                <div className="max-h-80 overflow-y-auto rounded-md border border-zinc-200">
                  <table className="tbl"><thead><tr><th>Permissão</th><th>Perfil</th><th>Conceder</th><th>Retirar</th></tr></thead><tbody>
                    {perms.map(([k, l]) => {
                      const inRole = u ? ROLE_PERMISSIONS[u.role].includes(k) : false;
                      return <tr key={k}><td className="text-xs">{l}<div className="font-mono text-[10px] text-zinc-400">{k}</div></td><td className="text-xs">{u ? (inRole ? "✓" : "—") : ""}</td>
                        <td><input type="checkbox" name="grants" value={k} defaultChecked={u?.grants.includes(k)} /></td><td><input type="checkbox" name="denies" value={k} defaultChecked={u?.denies.includes(k)} /></td></tr>;
                    })}
                  </tbody></table>
                </div>
              </div>
              <Submit>{u ? "Salvar usuário" : "Criar e enviar convite"}</Submit>
            </ActionForm>
          </Card>
        )}
      </div>
      <Card title="Perfis" className="mt-5">
        <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(ROLE_LABEL).map(([k, l]) => <div key={k}><div className="mb-1 font-semibold">{l}</div><ul className="space-y-0.5 text-zinc-600">{ROLE_PERMISSIONS[k as keyof typeof ROLE_PERMISSIONS].map((p) => <li key={p}>{PERMISSIONS[p]}</li>)}</ul></div>)}
        </div>
      </Card>
    </>
  );
}
