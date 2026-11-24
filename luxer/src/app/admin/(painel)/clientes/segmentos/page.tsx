import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BUILTIN_SEGMENTS, segmentWhere, type SegmentRules } from "@/lib/segments";
import { PageHeader, Card, Field } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { saveSegment, deleteSegment } from "../../../_actions/customers";

export const metadata = { title: "Segmentos" };

export default async function Segments() {
  await requireAdmin("customers.view");
  const [custom, cats] = await Promise.all([prisma.customerSegment.findMany({ orderBy: { name: "asc" } }), prisma.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" } })]);
  const counts = await Promise.all([...Object.values(BUILTIN_SEGMENTS).map((s) => prisma.customer.count({ where: segmentWhere(s.rules) })), ...custom.map((s) => prisma.customer.count({ where: segmentWhere(s.rules as SegmentRules) }))]);
  const all = [...Object.entries(BUILTIN_SEGMENTS).map(([k, v]) => ({ id: k, name: v.name, description: v.description, builtin: true })), ...custom.map((c) => ({ id: c.id, name: c.name, description: c.description ?? "", builtin: false }))];
  return (
    <>
      <PageHeader title="Segmentos de clientes" back={{ href: "/admin/clientes", label: "Clientes" }} subtitle="Segmentos são dinâmicos: recalculados a cada consulta. Podem ser usados em campanhas de e-mail." />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card pad={false}><table className="tbl"><thead><tr><th>Segmento</th><th className="text-right">Clientes</th><th /></tr></thead><tbody>
          {all.map((s, i) => <tr key={s.id}><td><Link href={`/admin/clientes?segmento=${s.id}`} className="font-medium hover:underline">{s.name}</Link><div className="text-[11px] text-zinc-500">{s.description}{s.builtin ? " · padrão" : ""}</div></td><td className="text-right tabular-nums">{counts[i]}</td>
            <td className="text-right">{!s.builtin && <ActionButton action={deleteSegment} fields={{ id: s.id }} label="Excluir" className="btn btn-danger !py-1 text-xs" confirm="Excluir segmento?" />}</td></tr>)}
        </tbody></table></Card>
        <Card title="Novo segmento">
          <ActionForm action={saveSegment} className="space-y-3">
            <Field label="Nome *"><input name="name" required className="input" /></Field>
            <Field label="Descrição"><input name="description" className="input" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mín. de pedidos"><input name="minOrders" type="number" min={0} className="input" /></Field>
              <Field label="Máx. de pedidos"><input name="maxOrders" type="number" min={0} className="input" /></Field>
              <Field label="Gasto mínimo (R$)"><input name="minSpent" className="input" /></Field>
              <Field label="Sem comprar há (dias)"><input name="inactiveDays" type="number" min={1} className="input" /></Field>
              <Field label="1ª compra nos últimos (dias)"><input name="sinceDays" type="number" min={1} className="input" /></Field>
            </div>
            <Field label="Compraram nas categorias"><div className="max-h-40 space-y-1 overflow-y-auto text-sm">{cats.map((c) => <label key={c.id} className="flex items-center gap-2"><input type="checkbox" name="categoryIds" value={c.id} /> {c.name}</label>)}</div></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="optIn" /> Somente quem aceita marketing</label>
            <Submit>Criar segmento</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
