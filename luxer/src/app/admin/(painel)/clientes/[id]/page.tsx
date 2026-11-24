import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptString } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { formatDate, formatMoney, formatCep } from "@/lib/format";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/lib/order-status";
import { PageHeader, Card, Badge, Field, Stat } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/forms";
import { saveCustomer, anonymizeCustomer } from "../../../_actions/customers";

export const metadata = { title: "Cliente" };

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cpf?: string }> }) {
  const admin = await requireAdmin("customers.view");
  const { id } = await params;
  const { cpf: reveal } = await searchParams;
  const c = await prisma.customer.findUnique({ where: { id }, include: { addresses: true, orders: { orderBy: { createdAt: "desc" }, take: 50 }, favorites: { include: { product: { select: { id: true, name: true } } } } } });
  if (!c) notFound();
  let cpf: string | null = null;
  if (c.cpfEnc) {
    const d = decryptString(c.cpfEnc);
    if (reveal && admin.can("customers.pii")) {
      cpf = d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      await audit(admin.id, "pii.view_cpf", "Customer", c.id);
    } else cpf = `***.***.***-${d.slice(-2)}`;
  }
  const topCats = await prisma.$queryRaw<{ name: string; n: bigint }[]>`
    SELECT cat."name", COUNT(*)::bigint n FROM "OrderItem" i JOIN "Order" o ON o."id"=i."orderId" JOIN "Category" cat ON cat."id" = ANY(i."categoryIds") AND cat."parentId" IS NULL
    WHERE o."customerId" = ${c.id} AND o."paidAt" IS NOT NULL GROUP BY cat."name" ORDER BY n DESC LIMIT 5`;
  const edit = admin.can("customers.edit") && !c.anonymizedAt;
  return (
    <>
      <PageHeader title={c.name} back={{ href: "/admin/clientes", label: "Clientes" }} subtitle={<>{c.email} · cliente desde {formatDate(c.createdAt)} {c.anonymizedAt && <Badge tone="gray">anonimizado</Badge>}</>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pedidos pagos" value={c.ordersCount} />
        <Stat label="Total gasto" value={formatMoney(c.totalSpentCents)} />
        <Stat label="Ticket médio" value={c.ordersCount ? formatMoney(Math.round(c.totalSpentCents / c.ordersCount)) : "—"} />
        <Stat label="Última compra" value={c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"} />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title="Pedidos" pad={false}>
            <table className="tbl"><tbody>
              {c.orders.length === 0 && <tr><td className="text-zinc-500">Nenhum pedido.</td></tr>}
              {c.orders.map((o) => <tr key={o.id}><td><Link className="font-semibold hover:underline" href={`/admin/pedidos/${o.id}`}>#{o.number}</Link></td><td className="text-xs">{formatDate(o.createdAt, true)}</td><td><Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge></td><td className="text-right tabular-nums">{formatMoney(o.totalCents)}</td></tr>)}
            </tbody></table>
          </Card>
          <div className="grid gap-5 md:grid-cols-2">
            <Card title="Categorias preferidas">{topCats.length ? <ul className="text-sm">{topCats.map((t) => <li key={t.name} className="flex justify-between"><span>{t.name}</span><span>{Number(t.n)}</span></li>)}</ul> : <p className="text-sm text-zinc-500">Sem compras.</p>}</Card>
            <Card title="Favoritos">{c.favorites.length ? <ul className="text-sm">{c.favorites.map((f) => <li key={f.productId}><Link className="hover:underline" href={`/admin/produtos/${f.product.id}`}>{f.product.name}</Link></li>)}</ul> : <p className="text-sm text-zinc-500">Nenhum favorito.</p>}</Card>
          </div>
          <Card title="Endereços">
            {c.addresses.length === 0 ? <p className="text-sm text-zinc-500">Nenhum endereço salvo.</p> : <div className="grid gap-3 sm:grid-cols-2">{c.addresses.map((a) => <address key={a.id} className="rounded-md border border-zinc-200 p-3 text-sm not-italic">{a.recipient}<br />{a.street}, {a.number}{a.complement ? ` — ${a.complement}` : ""}<br />{a.district} · {a.city}/{a.state} · {formatCep(a.postalCode)}{a.isDefault && <> <Badge tone="gold">padrão</Badge></>}</address>)}</div>}
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Cadastro">
            <ActionForm action={saveCustomer} className="space-y-3">
              <input type="hidden" name="id" value={c.id} />
              <fieldset disabled={!edit} className="space-y-3">
                <Field label="Nome"><input name="name" defaultValue={c.name} className="input" /></Field>
                <Field label="E-mail"><input name="email" defaultValue={c.email} className="input" /></Field>
                <Field label="Telefone"><input name="phone" defaultValue={c.phone ?? ""} className="input" /></Field>
                <div className="text-sm">CPF: <span className="font-mono">{cpf ?? "—"}</span> {c.cpfEnc && !reveal && admin.can("customers.pii") && <Link className="text-xs underline" href="?cpf=1">revelar (auditado)</Link>}</div>
                <Field label="Etiquetas"><input name="tags" defaultValue={c.tags.join(", ")} className="input" /></Field>
                <Field label="Observações internas"><textarea name="notes" defaultValue={c.notes ?? ""} rows={4} className="input" /></Field>
                <div className="space-y-1 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" name="marketingOptIn" defaultChecked={c.marketingOptIn} disabled={!c.marketingOptIn} /> Aceita e-mail marketing {c.marketingOptAt && <span className="text-xs text-zinc-500">({formatDate(c.marketingOptAt)})</span>}</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="whatsappOptIn" defaultChecked={c.whatsappOptIn} disabled={!c.whatsappOptIn} /> Aceita WhatsApp</label>
                  <p className="text-[11px] text-zinc-500">Consentimentos só podem ser concedidos pelo próprio cliente; a equipe pode apenas revogá-los.</p>
                </div>
                {edit && <Submit>Salvar</Submit>}
              </fieldset>
            </ActionForm>
          </Card>
          {edit && admin.can("customers.pii") && (
            <Card title="LGPD — direitos do titular">
              <p className="mb-2 text-xs text-zinc-600">Exportação: use “Exportar CSV” na lista. Para exclusão, os dados pessoais são anonimizados e os pedidos mantidos pelo prazo fiscal.</p>
              <ActionForm action={anonymizeCustomer} className="space-y-2"><input type="hidden" name="id" value={c.id} /><input name="reason" placeholder="Protocolo/motivo da solicitação" required className="input" /><Submit className="btn btn-danger" confirm="Anonimizar definitivamente os dados pessoais deste cliente?">Anonimizar dados</Submit></ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
