import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { BUILTIN_SEGMENTS } from "@/lib/segments";
import { campaignRecipients } from "@/lib/campaigns";
import { mailConfigured } from "@/lib/mail";
import { PageHeader, Card, Badge, Field, Empty, Alert } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { dtLocal } from "@/components/admin/dt";
import { saveCampaign, cancelCampaign } from "../../../_actions/marketing";

export const metadata = { title: "Campanhas" };
const ST: Record<string, ["green" | "amber" | "blue" | "gray" | "red", string]> = { DRAFT: ["gray", "Rascunho"], SCHEDULED: ["amber", "Agendada"], SENDING: ["blue", "Enviando"], SENT: ["green", "Enviada"], CANCELED: ["red", "Cancelada"] };

export default async function Campaigns({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  await requireAdmin("marketing.manage");
  const { editar } = await searchParams;
  const [list, custom] = await Promise.all([prisma.campaign.findMany({ orderBy: { createdAt: "desc" } }), prisma.customerSegment.findMany()]);
  const c = editar ? list.find((x) => x.id === editar) : null;
  const segs: [string, string][] = [["", "Todos que aceitam marketing (clientes + newsletter)"], ["leads", "Somente newsletter (leads)"], ...Object.entries(BUILTIN_SEGMENTS).map(([k, v]) => [k, `Clientes: ${v.name}`] as [string, string]), ...custom.map((s) => [s.id, `Clientes: ${s.name}`] as [string, string])];
  const audience = await campaignRecipients(c?.segmentId ?? null);
  return (
    <>
      <PageHeader title="Campanhas de e-mail" subtitle="Enviadas somente a quem consentiu, com link de descadastro em todas as mensagens." />
      {!mailConfigured() && <div className="mb-4"><Alert>SMTP não configurado: campanhas agendadas não serão entregues até a configuração do provedor de e-mail.</Alert></div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_460px]">
        <Card pad={false}>{list.length === 0 ? <Empty title="Nenhuma campanha" /> : <table className="tbl"><thead><tr><th>Campanha</th><th>Status</th><th>Destinatários</th><th>Envio</th><th /></tr></thead><tbody>
          {list.map((x) => <tr key={x.id}><td className="font-medium">{x.name}<div className="text-[11px] text-zinc-500">{x.subject}</div></td><td><Badge tone={ST[x.status][0]}>{ST[x.status][1]}</Badge></td><td className="tabular-nums">{x.recipients}</td><td className="text-xs">{x.sentAt ? formatDate(x.sentAt, true) : x.scheduledAt ? formatDate(x.scheduledAt, true) : "—"}</td>
            <td className="text-right space-x-1">{["DRAFT", "SCHEDULED"].includes(x.status) && <><Link className="btn !py-1 text-xs" href={`?editar=${x.id}`}>Editar</Link><ActionButton action={cancelCampaign} fields={{ id: x.id }} label="Cancelar" className="btn btn-danger !py-1 text-xs" confirm="Cancelar campanha?" /></>}</td></tr>)}
        </tbody></table>}</Card>
        <Card title={c ? "Editar campanha" : "Nova campanha"} actions={c && <Link href="/admin/marketing/campanhas" className="text-xs text-zinc-500">+ nova</Link>}>
          <ActionForm action={saveCampaign} className="space-y-3" key={c?.id ?? "new"}>
            {c && <input type="hidden" name="id" value={c.id} />}
            <Field label="Nome interno *"><input name="name" defaultValue={c?.name} required className="input" /></Field>
            <Field label="Público" hint={c ? `${audience.length} destinatário(s) com consentimento neste público.` : undefined}><select name="segmentId" defaultValue={c?.segmentId ?? ""} className="input">{segs.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Assunto"><input name="subject" defaultValue={c?.subject ?? ""} className="input" /></Field>
            <Field label="Conteúdo" hint="Parágrafos separados por linha em branco."><textarea name="content" defaultValue={c?.content ?? ""} rows={8} className="input" /></Field>
            <Field label="Parâmetros UTM" hint="ex.: utm_source=email&utm_campaign=natal"><input name="utm" defaultValue={c?.utm ?? ""} className="input" /></Field>
            <Field label="Enviar em" hint="Vazio = assim que agendar."><input type="datetime-local" name="scheduledAt" defaultValue={dtLocal(c?.scheduledAt)} className="input" /></Field>
            <div className="flex gap-2"><Submit name="intent" value="draft" className="btn">Salvar rascunho</Submit><Submit name="intent" value="schedule" confirm="Agendar o envio desta campanha?">Agendar envio</Submit></div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
