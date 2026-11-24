import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePeriod, pctDelta } from "@/lib/reports";
import { financeSummary } from "@/lib/finance";
import { formatDate, formatMoney } from "@/lib/format";
import { PAYMENT_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/order-status";
import { PageHeader, Card, Stat, Badge, Alert, Empty, qs } from "@/components/admin/ui";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { ActionButton } from "@/components/admin/forms";
import { reconcileAction } from "../../_actions/finance";
import { pagarmeConfigured } from "@/lib/payments/pagarme";

export const metadata = { title: "Financeiro" };

export default async function Finance({ searchParams }: { searchParams: Promise<{ periodo?: string; de?: string; ate?: string }> }) {
  const admin = await requireAdmin("finance.view");
  const sp = await searchParams;
  const period = parsePeriod(sp);
  const [f, prev, txs] = await Promise.all([
    financeSummary(period.from, period.to),
    financeSummary(period.prevFrom, period.prevTo),
    prisma.payment.findMany({ where: { createdAt: { gte: period.from, lt: period.to } }, orderBy: { createdAt: "desc" }, take: 60, include: { order: { select: { id: true, number: true, name: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="Financeiro" subtitle={period.label} actions={<PeriodFilter base="/admin/financeiro" current={period.key} de={sp.de} ate={sp.ate} />} />
      <Alert tone="blue"><b>Faturamento não é lucro.</b> Faturamento é o valor pago pelos clientes. Recebimento é o que a Pagar.me repassa após taxas e reembolsos. Lucro depende do custo das peças e despesas da operação. Só estimamos a margem bruta dos itens que têm custo cadastrado.</Alert>

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Faturamento</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Faturamento bruto" value={formatMoney(f.gross)} delta={pctDelta(f.gross, prev.gross)} hint={`${f.orders} pedido(s) pago(s)`} />
        <Stat label="Reembolsos" value={formatMoney(f.refunds)} />
        <Stat label="Vendas líquidas" value={formatMoney(f.net)} delta={pctDelta(f.net, prev.net)} hint="bruto − reembolsos" />
        <Stat label="Ticket médio" value={formatMoney(f.ticket)} delta={pctDelta(f.ticket, prev.ticket)} />
        <Stat label="Descontos concedidos" value={formatMoney(f.discounts)} hint="cupons + Pix" />
        <Stat label="Frete recebido" value={formatMoney(f.shipping)} />
        <Stat label="Juros de parcelamento" value={formatMoney(f.interest)} />
        <Stat label="Aguardando pagamento" value={formatMoney(f.pendingCents)} hint={`${f.pendingCount} pedido(s) em aberto`} />
      </div>

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Recebimento (gateway)</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Taxas de pagamento" value={formatMoney(f.fees)} hint={`${f.feesKnownCount}/${f.paymentsCount} pagamento(s) com taxa informada`} />
        <Stat label="Recebido no período" value={formatMoney(f.receivedCents)} hint="repasses com data no período" />
        <Stat label="A receber" value={formatMoney(f.toReceiveCents)} hint="repasses futuros conciliados" />
        <div className="card flex flex-col justify-between p-4">
          <div className="text-xs font-medium text-zinc-500">Conciliação</div>
          <div className="mt-1 text-sm">{f.unreconciled} pagamento(s) sem conciliar</div>
          {pagarmeConfigured() ? <div className="mt-2"><ActionButton action={reconcileAction} fields={{}} label="Conciliar com a Pagar.me" className="btn btn-primary !py-1.5 text-xs" pendingText="Consultando…" /></div> : <div className="mt-2 text-xs text-amber-700">Pagar.me não configurada.</div>}
        </div>
      </div>

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Resultado</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Custo das peças vendidas" value={f.cogs ? formatMoney(f.cogs) : "—"} hint={f.itemsWithoutCost ? `${f.itemsWithoutCost} item(ns) sem custo cadastrado` : undefined} />
        <Stat label="Margem bruta estimada" value={f.grossMargin != null ? formatMoney(f.grossMargin) : "—"} hint={f.grossMargin != null ? `sobre ${formatMoney(f.revenueWithCost)} de itens com custo` : "cadastre o custo nos produtos"} />
        <Stat label="Lucro líquido" value="—" hint="exige despesas operacionais (fora do sistema)" />
      </div>

      <Card title="Transações do período" className="mt-6" pad={false} actions={admin.can("finance.export") && <a className="btn !py-1 text-xs" href={`/api/admin/relatorios/transacoes${qs({ periodo: sp.periodo, de: sp.de, ate: sp.ate }, {})}`}>Exportar CSV</a>}>
        {txs.length === 0 ? <Empty title="Sem transações no período" /> : <div className="overflow-x-auto"><table className="tbl">
          <thead><tr><th>Data</th><th>Pedido</th><th>Forma</th><th>Status</th><th className="text-right">Valor</th><th className="text-right">Taxa</th><th className="text-right">Líquido</th><th>Repasse</th><th>ID gateway</th></tr></thead>
          <tbody>{txs.map((t) => <tr key={t.id}>
            <td className="whitespace-nowrap text-xs">{formatDate(t.createdAt, true)}</td>
            <td><Link className="hover:underline" href={`/admin/pedidos/${t.order.id}`}>#{t.order.number}</Link><div className="text-[11px] text-zinc-500">{t.order.name}</div></td>
            <td className="text-xs">{PAYMENT_METHOD_LABEL[t.method]}{t.installments > 1 ? ` ${t.installments}x` : ""}</td>
            <td><Badge tone={t.status === "PAID" ? "green" : t.status === "FAILED" || t.status === "CANCELED" ? "red" : t.status.includes("REFUND") ? "gray" : "amber"}>{PAYMENT_STATUS_LABEL[t.status]}</Badge></td>
            <td className="text-right tabular-nums">{formatMoney(t.amountCents)}</td>
            <td className="text-right tabular-nums">{t.feeCents != null ? formatMoney(t.feeCents) : "—"}</td>
            <td className="text-right tabular-nums">{t.netCents != null ? formatMoney(t.netCents) : "—"}</td>
            <td className="text-xs">{t.expectedPayoutAt ? formatDate(t.expectedPayoutAt) : "—"}</td>
            <td className="font-mono text-[11px] text-zinc-500">{t.providerChargeId ?? "—"}</td>
          </tr>)}</tbody></table></div>}
      </Card>
    </>
  );
}
