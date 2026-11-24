import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePeriod } from "@/lib/reports";
import { REVENUE_STATUSES, PAYMENT_METHOD_LABEL } from "@/lib/order-status";
import { formatMoney } from "@/lib/format";
import { PageHeader, Card, qs } from "@/components/admin/ui";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { BarList } from "@/components/admin/charts";

export const metadata = { title: "Relatórios" };

export default async function Reports({ searchParams }: { searchParams: Promise<{ periodo?: string; de?: string; ate?: string }> }) {
  const admin = await requireAdmin("reports.view");
  const sp = await searchParams;
  const p = parsePeriod(sp);
  const st = REVENUE_STATUSES as string[];
  const [products, states, methods, coupons, hours, stockValue] = await Promise.all([
    prisma.$queryRaw<{ name: string; ref: string | null; qty: bigint; total: bigint; cost: bigint | null }[]>`
      SELECT MAX(i."name") name, MAX(pr."ref") ref, SUM(i."quantity")::bigint qty, SUM(i."totalCents")::bigint total, SUM(pr."costCents" * i."quantity")::bigint cost
      FROM "OrderItem" i JOIN "Order" o ON o."id"=i."orderId" LEFT JOIN "Product" pr ON pr."id"=i."productId"
      WHERE o."paidAt" >= ${p.from} AND o."paidAt" < ${p.to} AND o."status"::text = ANY(${st}) GROUP BY i."productId" ORDER BY total DESC LIMIT 30`,
    prisma.$queryRaw<{ uf: string; n: bigint; total: bigint }[]>`SELECT coalesce("shipState",'—') uf, COUNT(*)::bigint n, SUM("totalCents")::bigint total FROM "Order" WHERE "paidAt" >= ${p.from} AND "paidAt" < ${p.to} AND "status"::text = ANY(${st}) GROUP BY 1 ORDER BY total DESC`,
    prisma.order.groupBy({ by: ["paymentMethod"], where: { paidAt: { gte: p.from, lt: p.to }, status: { in: REVENUE_STATUSES } }, _count: true, _sum: { totalCents: true } }),
    prisma.order.groupBy({ by: ["couponCode"], where: { paidAt: { gte: p.from, lt: p.to }, status: { in: REVENUE_STATUSES }, couponCode: { not: null } }, _count: true, _sum: { totalCents: true, discountCents: true } }),
    prisma.$queryRaw<{ h: number; n: bigint }[]>`SELECT EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'America/Sao_Paulo')::int h, COUNT(*)::bigint n FROM "Order" WHERE "createdAt" >= ${p.from} AND "createdAt" < ${p.to} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ units: bigint; retail: bigint; cost: bigint | null }[]>`SELECT SUM(v."stock")::bigint units, SUM(v."stock" * coalesce(v."priceCents", p."priceCents"))::bigint retail, SUM(v."stock" * p."costCents")::bigint cost FROM "ProductVariant" v JOIN "Product" p ON p."id"=v."productId" WHERE p."trackStock" AND v."stock" > 0`,
  ]);
  const sv = stockValue[0];
  const base = { periodo: sp.periodo, de: sp.de, ate: sp.ate };
  return (
    <>
      <PageHeader title="Relatórios gerenciais" subtitle={p.label} actions={<><PeriodFilter base="/admin/relatorios" current={p.key} de={sp.de} ate={sp.ate} />{(admin.can("finance.export") || admin.can("reports.view")) && <a className="btn" href={`/api/admin/relatorios/produtos${qs(base, {})}`}>CSV de produtos</a>}</>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Vendas por produto" pad={false} className="lg:col-span-2"><div className="overflow-x-auto"><table className="tbl">
          <thead><tr><th>Produto</th><th>Ref.</th><th className="text-right">Qtd.</th><th className="text-right">Faturamento</th><th className="text-right">Margem bruta*</th></tr></thead>
          <tbody>{products.length === 0 ? <tr><td colSpan={5} className="text-zinc-500">Sem vendas no período.</td></tr> : products.map((r, i) => <tr key={i}><td>{r.name}</td><td className="text-xs">{r.ref}</td><td className="text-right tabular-nums">{Number(r.qty)}</td><td className="text-right tabular-nums">{formatMoney(Number(r.total))}</td><td className="text-right tabular-nums">{r.cost != null ? formatMoney(Number(r.total) - Number(r.cost)) : "—"}</td></tr>)}</tbody>
        </table></div><p className="px-4 py-2 text-[11px] text-zinc-500">* Margem bruta = faturamento do item − custo cadastrado. Não inclui frete, taxas, impostos e despesas; não é lucro.</p></Card>
        <Card title="Faturamento por estado"><BarList rows={states.map((s) => ({ label: s.uf, value: Number(s.total), hint: `${Number(s.n)} pedido(s)` }))} /></Card>
        <Card title="Formas de pagamento"><BarList rows={methods.map((m) => ({ label: PAYMENT_METHOD_LABEL[m.paymentMethod], value: m._sum.totalCents ?? 0, hint: `${m._count} pedido(s)` }))} /></Card>
        <Card title="Cupons utilizados"><BarList rows={coupons.map((c) => ({ label: c.couponCode!, value: c._sum.totalCents ?? 0, hint: `${c._count} pedido(s) · desconto ${formatMoney(c._sum.discountCents ?? 0)}` }))} /></Card>
        <Card title="Pedidos por hora do dia (Brasília)"><BarList format="int" rows={hours.map((h) => ({ label: `${String(h.h).padStart(2, "0")}h`, value: Number(h.n) }))} /></Card>
        <Card title="Estoque controlado (valor)">
          <dl className="space-y-2 text-sm"><div className="flex justify-between"><dt>Unidades</dt><dd className="tabular-nums">{Number(sv?.units ?? 0)}</dd></div>
            <div className="flex justify-between"><dt>Valor a preço de venda</dt><dd className="tabular-nums">{formatMoney(Number(sv?.retail ?? 0))}</dd></div>
            <div className="flex justify-between"><dt>Valor a custo</dt><dd className="tabular-nums">{sv?.cost != null ? formatMoney(Number(sv.cost)) : "— (cadastre custos)"}</dd></div></dl>
          <p className="mt-2 text-[11px] text-zinc-500">Considera apenas produtos com controle de estoque ativo.</p>
        </Card>
      </div>
    </>
  );
}
