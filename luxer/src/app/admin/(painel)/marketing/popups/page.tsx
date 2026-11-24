import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge, Field, Empty } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { dtLocal } from "@/components/admin/dt";
import { savePopup, deletePopup } from "../../../_actions/marketing";

export const metadata = { title: "Pop-ups" };

export default async function Popups({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  await requireAdmin("marketing.manage");
  const { editar } = await searchParams;
  const list = await prisma.popup.findMany({ orderBy: { createdAt: "desc" } });
  const p = editar ? list.find((x) => x.id === editar) : null;
  return (
    <>
      <PageHeader title="Pop-ups e captura de leads" subtitle="Exibido uma vez por visitante. A captura de e-mail registra o consentimento (LGPD)." />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card pad={false}>{list.length === 0 ? <Empty title="Nenhum pop-up" /> : <table className="tbl"><thead><tr><th>Pop-up</th><th>Páginas</th><th>Visualizações</th><th>Conversões</th><th>Status</th><th /></tr></thead><tbody>
          {list.map((x) => <tr key={x.id}><td className="font-medium">{x.name}<div className="text-[11px] text-zinc-500">{x.title}</div></td><td className="text-xs">{x.pages}</td><td className="tabular-nums">{x.views}</td><td className="tabular-nums">{x.conversions}{x.views ? ` (${((x.conversions / x.views) * 100).toFixed(1)}%)` : ""}</td><td>{x.active ? <Badge tone="green">Ativo</Badge> : <Badge>Inativo</Badge>}</td><td className="text-right"><Link className="btn !py-1 text-xs" href={`?editar=${x.id}`}>Editar</Link></td></tr>)}
        </tbody></table>}</Card>
        <Card title={p ? "Editar pop-up" : "Novo pop-up"} actions={p && <Link href="/admin/marketing/popups" className="text-xs text-zinc-500">+ novo</Link>}>
          <ActionForm action={savePopup} className="space-y-3" key={p?.id ?? "new"}>
            {p && <input type="hidden" name="id" value={p.id} />}
            <Field label="Nome interno"><input name="name" defaultValue={p?.name} className="input" /></Field>
            <Field label="Título *"><input name="title" defaultValue={p?.title} required className="input" /></Field>
            <Field label="Texto"><textarea name="body" defaultValue={p?.body ?? ""} rows={3} className="input" /></Field>
            <Field label="Imagem"><input type="file" name="image" accept="image/*" className="text-sm" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Texto do botão"><input name="ctaLabel" defaultValue={p?.ctaLabel ?? ""} className="input" /></Field>
              <Field label="Link"><input name="ctaUrl" defaultValue={p?.ctaUrl ?? ""} className="input" /></Field>
              <Field label="Cupom revelado"><input name="couponCode" defaultValue={p?.couponCode ?? ""} className="input font-mono uppercase" /></Field>
              <Field label="Atraso (segundos)"><input name="delaySeconds" type="number" min={0} defaultValue={p?.delaySeconds ?? 8} className="input" /></Field>
              <Field label="Páginas"><select name="pages" defaultValue={p?.pages ?? "all"} className="input"><option value="all">Todas</option><option value="home">Homepage</option><option value="product">Produtos</option><option value="category">Categorias</option></select></Field>
              <div />
              <Field label="Início"><input type="datetime-local" name="startsAt" defaultValue={dtLocal(p?.startsAt)} className="input" /></Field>
              <Field label="Fim"><input type="datetime-local" name="endsAt" defaultValue={dtLocal(p?.endsAt)} className="input" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="collectEmail" defaultChecked={p?.collectEmail ?? true} /> Capturar e-mail (newsletter)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? false} /> Ativo</label>
            <Submit>Salvar pop-up</Submit>
          </ActionForm>
          {p && <div className="mt-3 border-t pt-3"><ActionButton action={deletePopup} fields={{ id: p.id }} label="Excluir" className="btn btn-danger" confirm="Excluir pop-up?" /></div>}
        </Card>
      </div>
    </>
  );
}
