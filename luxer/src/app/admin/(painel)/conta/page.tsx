import { requireAdmin, PASSWORD_RULES } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Field, Badge } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { changeOwnPassword, revokeSession } from "../../_actions/admin-misc";

export const metadata = { title: "Minha conta" };

export default async function Account() {
  const admin = await requireAdmin();
  const sessions = await prisma.adminSession.findMany({ where: { userId: admin.id }, orderBy: { lastSeenAt: "desc" } });
  return (
    <>
      <PageHeader title="Minha conta" subtitle={admin.email} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Alterar senha">
          <ActionForm action={changeOwnPassword} className="space-y-3" resetOnSuccess>
            <Field label="Senha atual"><input type="password" name="current" required className="input" autoComplete="current-password" /></Field>
            <Field label="Nova senha" hint={PASSWORD_RULES}><input type="password" name="password" required className="input" autoComplete="new-password" /></Field>
            <Field label="Confirmar"><input type="password" name="confirm" required className="input" autoComplete="new-password" /></Field>
            <Submit>Alterar senha</Submit>
          </ActionForm>
        </Card>
        <Card title="Sessões ativas" pad={false}><table className="tbl"><tbody>{sessions.map((s) => (
          <tr key={s.id}><td className="text-xs">{s.userAgent?.slice(0, 60)}<div className="text-zinc-500">{s.ip} · visto {formatDate(s.lastSeenAt, true)}</div></td>
            <td className="text-right">{s.id === admin.sessionId ? <Badge tone="green">esta</Badge> : <ActionButton action={revokeSession} fields={{ id: s.id }} label="Encerrar" className="btn !py-1 text-xs" />}</td></tr>
        ))}</tbody></table></Card>
      </div>
    </>
  );
}
