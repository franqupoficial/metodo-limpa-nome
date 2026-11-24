import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { dashboard, parsePeriod, pctDelta } from "@/lib/reports";
import { formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { PageHeader, Stat, Card, Badge, Empty } from "@/components/admin/ui";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { RevenueChart, BarList } from "@/components/admin/charts";
import { pagarmeConfigured } from "@/lib/payments/pagarme";
import { mailConfigured } from "@/lib/mail";

export const metadata = { title: "Visão geral" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ periodo?: string; de?: string; ate?: string }> }) {
  const admin = await requireAdmin("dashboard.view");
  const sp = await searchParams;
  const period = parsePeriod(sp);
  const d = await dashboard(period);
  const showMoney = admin.can("finance.view") || admin.can("reports.view");
  const pending = [
    !pagarmeConfigured() && "Pagar.me não configurada — o checkout não aceita pagamentos.",
    !mailConfigured() && "SMTP não configurado — e-mails transacionais não estão sendo enviados.",
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader title={`Olá, ${admin.name.split(" ")[0]}`} subtitle={`${period.label} · comparado ao período anterior de mesma duração`} actions={<PeriodFilter base="/admin" current={period.key} de={sp.de} ate={sp.ate} />} />
      {pending.length > 0 && admin.can("integrations.manage") && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <b>Pendências de configuração:</b>
          <ul className="mt-1 list-disc pl-5">{pending.map((p) => <li key={p}>{p}</li>)}</ul>
          <Link href="/admin/configuracoes/integracoes" className="mt-1 inline-block font-semibold underline">Ver integrações</Link>
        </div>
      )}

      {showMoney && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Faturamento hoje" value={formatMoney(d.day.revenue)} hint={`${d.day.orders} pedido(s) pago(s)`} />
          <Stat label="Faturamento do mês" value={formatMoney(d.month.revenue)} hint={`${d.month.orders} pedido(s) pago(s)`} />
          <Stat label={`Faturamento · ${period.label.toLowerCase()}`} value={formatMoney(d.cur.revenue)} delta={pctDelta(d.cur.revenue, d.prev.revenue)} hint="bruto, pedidos pagos" />
          <Stat label="Ticket médio" value={formatMoney(d.cur.ticket)} delta={pctDelta(d.cur.ticket, d.prev.ticket)} />
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Vendas realizadas" value={d.cur.orders} delta={pctDelta(d.cur.orders, d.prev.orders)} hint="pedidos pagos" />
        <Stat label="Aguardando pagamento" value={d.open.AWAITING_PAYMENT ?? 0} hint="agora" href="/admin/pedidos?status=AWAITING_PAYMENT" />
        <Stat label="A separar / enviar" value={(d.open.PAID ?? 0) + (d.open.PICKING ?? 0) + (d.open.READY_TO_SHIP ?? 0)} hint="pagos ainda não enviados" href="/admin/pedidos?status=abertos" />
        <Stat
          label="Taxa de conversão"
          value={d.conversion == null ? "—" : `${d.conversion.toFixed(2).replace(".", ",")}%`}
          delta={d.conversion != null && d.prevConversion != null ? pctDelta(d.conversion, d.prevConversion) : null}
          hint={d.conversion == null ? `amostra insuficiente (${d.visits} visitantes)` : `${d.visits} visitantes únicos`}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {showMoney && (
          <Card title="Evolução do faturamento" className="xl:col-span-2">
            <RevenueChart data={d.chart} currentLabel={period.label} previousLabel="Período anterior" />
          </Card>
        )}
        <Card title="Pedidos criados no período">
          <ul className="space-y-2 text-sm">
            {(["AWAITING_PAYMENT", "PAID", "PICKING", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"] as const).map((s) => (
              <li key={s} className="flex items-center justify-between">
                <Link href={`/admin/pedidos?status=${s}`} className="text-zinc-700 hover:underline">{ORDER_STATUS_LABEL[s]}</Link>
                <span className="tabular-nums font-semibold">{d.byStatus[s] ?? 0}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4 text-center">
            <div><div className="text-lg font-semibold">{d.newCustomers}</div><div className="text-[11px] text-zinc-500">clientes novos</div></div>
            <div><div className="text-lg font-semibold">{d.recurring}</div><div className="text-[11px] text-zinc-500">recorrentes</div></div>
            <Link href="/admin/marketing/carrinhos"><div className="text-lg font-semibold">{d.abandoned}</div><div className="text-[11px] text-zinc-500">carrinhos abandonados</div></Link>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Mais vendidos" pad={false}>
          {d.topProducts.length === 0 ? <Empty title="Sem vendas no período" /> : (
            <table className="tbl"><tbody>{d.topProducts.map((p) => (
              <tr key={p.productId}><td><Link href={`/admin/produtos/${p.productId}`} className="line-clamp-1 hover:underline">{p.name}</Link></td><td className="text-right tabular-nums">{p.qty} un.</td>{showMoney && <td className="text-right tabular-nums">{formatMoney(p.total)}</td>}</tr>
            ))}</tbody></table>
          )}
        </Card>
        {showMoney && (
          <Card title="Vendas por categoria">
            <BarList rows={d.byCategory.map((c) => ({ label: c.name, value: c.total }))} />
          </Card>
        )}
        <Card title="Estoque baixo" actions={<Link href="/admin/estoque?filtro=baixo" className="text-xs font-semibold text-zinc-500 hover:underline">ver todos</Link>} pad={false}>
          {d.lowStock.length === 0 ? <Empty title="Nenhum item abaixo do mínimo">Produtos com controle de estoque ativo aparecem aqui quando o saldo disponível atinge o mínimo.</Empty> : (
            <table className="tbl"><tbody>{d.lowStock.map((v) => (
              <tr key={v.id}><td><Link href={`/admin/produtos/${v.productId}`} className="line-clamp-1 hover:underline">{v.name}</Link><div className="text-[11px] text-zinc-500">{v.sku}{v.option ? ` · ${v.option}` : ""}</div></td>
                <td className="text-right"><Badge tone={v.stock - v.reserved <= 0 ? "red" : "amber"}>{v.stock - v.reserved} disp.</Badge></td></tr>
            ))}</tbody></table>
          )}
        </Card>
      </div>
    </>
  );
}
