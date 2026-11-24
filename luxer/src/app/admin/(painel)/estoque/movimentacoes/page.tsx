import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, Pagination, Empty, qs } from "@/components/admin/ui";

export const metadata = { title: "Movimentações de estoque" };
const LABEL: Record<string, [string, "green" | "red" | "blue" | "amber" | "gray" | "violet"]> = {
  IN: ["Entrada", "green"], OUT: ["Saída", "red"], ADJUST: ["Ajuste", "amber"], INVENTORY: ["Inventário", "violet"],
  RESERVE: ["Reserva", "blue"], RELEASE: ["Liberação", "gray"], SALE: ["Venda", "red"], RETURN: ["Estorno", "green"],
};

export default async function Movements({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; page?: string }> }) {
  await requireAdmin("stock.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = {
    ...(sp.tipo ? { type: sp.tipo as "IN" } : {}),
    ...(sp.q ? { variant: { OR: [{ sku: { contains: sp.q, mode: "insensitive" as const } }, { product: { name: { contains: sp.q, mode: "insensitive" as const } } }] } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { variant: { select: { sku: true, option: true, product: { select: { id: true, name: true } } } } } }),
  ]);
  const admins = Object.fromEntries((await prisma.adminUser.findMany({ select: { id: true, name: true } })).map((a) => [a.id, a.name]));
  const orders = Object.fromEntries((await prisma.order.findMany({ where: { id: { in: rows.map((r) => r.orderId).filter(Boolean) as string[] } }, select: { id: true, number: true } })).map((o) => [o.id, o.number]));
  return (
    <>
      <PageHeader title="Movimentações de estoque" subtitle="Histórico completo e imutável de entradas, saídas, reservas e vendas." />
      <Card className="mb-4"><form className="flex flex-wrap gap-2"><input name="q" defaultValue={sp.q} placeholder="Produto ou SKU" className="input min-w-0 flex-1" />
        <select name="tipo" defaultValue={sp.tipo ?? ""} className="input !w-auto"><option value="">Todos os tipos</option>{Object.entries(LABEL).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select><button className="btn">Filtrar</button></form></Card>
      <Card pad={false}>
        {rows.length === 0 ? <Empty title="Sem movimentações" /> : <div className="overflow-x-auto"><table className="tbl">
          <thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th className="text-right">Qtd.</th><th className="text-right">Reserva</th><th className="text-right">Saldo</th><th>Motivo</th><th>Por</th></tr></thead>
          <tbody>{rows.map((m) => (
            <tr key={m.id}><td className="whitespace-nowrap text-xs">{formatDate(m.createdAt, true)}</td><td><Badge tone={LABEL[m.type][1]}>{LABEL[m.type][0]}</Badge></td>
              <td><Link className="hover:underline" href={`/admin/produtos/${m.variant.product.id}`}>{m.variant.product.name}</Link><div className="font-mono text-[11px] text-zinc-500">{m.variant.sku}</div></td>
              <td className={`text-right tabular-nums ${m.quantity > 0 ? "text-emerald-700" : m.quantity < 0 ? "text-red-700" : ""}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
              <td className="text-right tabular-nums text-zinc-500">{m.reservedDiff ? (m.reservedDiff > 0 ? `+${m.reservedDiff}` : m.reservedDiff) : ""}</td>
              <td className="text-right tabular-nums">{m.stockAfter}</td>
              <td className="text-xs">{m.reason}{m.orderId && <> · <Link className="underline" href={`/admin/pedidos/${m.orderId}`}>pedido #{orders[m.orderId]}</Link></>}</td>
              <td className="text-xs">{m.adminId ? admins[m.adminId] : "sistema"}</td></tr>
          ))}</tbody></table></div>}
        <Pagination page={page} pages={Math.ceil(total / 50)} total={total} makeHref={(n) => `/admin/estoque/movimentacoes${qs({ q: sp.q, tipo: sp.tipo }, { page: n })}`} />
      </Card>
    </>
  );
}
