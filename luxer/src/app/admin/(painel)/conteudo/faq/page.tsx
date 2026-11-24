import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Field } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit, Collapsible } from "@/components/admin/forms";
import { saveFaq } from "../../../_actions/content";

export const metadata = { title: "Perguntas frequentes" };

export default async function Faq() {
  await requireAdmin("content.manage");
  const items = await prisma.faqItem.findMany({ orderBy: [{ group: "asc" }, { position: "asc" }] });
  const form = (f?: (typeof items)[number]) => (
    <ActionForm action={saveFaq} className="grid gap-3 sm:grid-cols-4" resetOnSuccess={!f}>
      {f && <input type="hidden" name="id" value={f.id} />}
      <Field label="Pergunta" className="sm:col-span-3"><input name="question" defaultValue={f?.question} required className="input" /></Field>
      <Field label="Grupo"><input name="group" defaultValue={f?.group ?? "Geral"} className="input" /></Field>
      <Field label="Resposta" className="sm:col-span-4"><textarea name="answer" defaultValue={f?.answer} rows={3} required className="input" /></Field>
      <Field label="Ordem"><input name="position" type="number" defaultValue={f?.position ?? 0} className="input" /></Field>
      <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="active" defaultChecked={f?.active ?? true} /> Ativa</label>
      <div className="self-end"><Submit>Salvar</Submit></div>
    </ActionForm>
  );
  return (
    <>
      <PageHeader title="Perguntas frequentes" subtitle="Exibidas em /perguntas-frequentes, agrupadas." />
      <div className="space-y-3">
        {items.map((f) => (
          <Collapsible key={f.id} title={`[${f.group}] ${f.question}${f.active ? "" : " (inativa)"}`}>
            {form(f)}
            <div className="mt-3"><ActionButton action={saveFaq} fields={{ id: f.id, op: "delete" }} label="Excluir" className="btn btn-danger !py-1 text-xs" confirm="Excluir pergunta?" /></div>
          </Collapsible>
        ))}
      </div>
      <Card title="Nova pergunta" className="mt-5">{form()}</Card>
    </>
  );
}
