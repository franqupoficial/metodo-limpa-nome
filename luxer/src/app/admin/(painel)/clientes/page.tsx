import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney, formatPhone } from "@/lib/format";
import { BUILTIN_SEGMENTS } from "@/lib/segments";
import { resolveSegment } from "@/lib/segment-resolve";
import { PageHeader, Card, Badge, Pagination, Empty, qs } from "@/components/admin/ui";

export const metadata = { title: "Clientes" };
const PER = 40;

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; segmento?: string; ordem?: string; page?: string }> }) {
  const admin = await requireAdmin("customers.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const seg = await resolveSegment(sp.segmento);
  const q = sp.q?.trim();
  const where: Prisma.CustomerWhereInput = {
    AND: [
      { anonymizedAt: null },
      seg?.where ?? {},
      q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, ...(q.replace(/\D/g, "").length >= 4 ? [{ phone: { contains: q.replace(/\D/g, "") } }] : [])] } : {},
    ],
  };
  const orderBy: Prisma.CustomerOrderByWithRelationInput = sp.ordem === "gasto" ? { totalSpentCents: "desc" } : sp.ordem === "ultima" ? { lastOrderAt: { sort: "desc", nulls: "last" } } : { createdAt: "desc" };
  const [total, rows, custom] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, orderBy, skip: (page - 1) * PER, take: PER }),
    prisma.customerSegment.findMany({ orderBy: { name: "asc" } }),
  ]);
  const base = { q: sp.q, segmento: sp.segmento, ordem: sp.ordem };
  return (
    <>
      <PageHeader title="Clientes" subtitle={seg ? `Segmento: ${seg.name} — ${total} cliente(s)` : `${total} cliente(s)`}
        actions={<>{admin.can("customers.export") && <a className="btn" href={`/api/admin/clientes${qs(base, {})}`}>Exportar CSV</a>}<Link href="/admin/clientes/segmentos" className="btn">Segmentos</Link></>} />
      <div className="mb-3 flex flex-wrap gap-1">
        <Link href="/admin/clientes" className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!sp.segmento ? "bg-zinc-900 text-[#f3e7cf]" : "bg-white ring-1 ring-zinc-200"}`}>Todos</Link>
        {[...Object.entries(BUILTIN_SEGMENTS).map(([k, v]) => [k, v.name]), ...custom.map((c) => [c.id, c.name])].map(([k, l]) => (
          <Link key={k} href={`/admin/clientes?segmento=${k}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sp.segmento === k ? "bg-zinc-900 text-[#f3e7cf]" : "bg-white text-zinc-600 ring-1 ring-zinc-200"}`}>{l}</Link>
        ))}
      </div>
      <Card className="mb-4"><form className="flex flex-wrap gap-2"><input type="hidden" name="segmento" value={sp.segmento ?? ""} />
        <input name="q" defaultValue={sp.q} placeholder="Nome, e-mail ou telefone" className="input min-w-0 flex-1" />
        <select name="ordem" defaultValue={sp.ordem ?? ""} className="input !w-auto"><option value="">Mais recentes</option><option value="gasto">Maior gasto</option><option value="ultima">Última compra</option></select><button className="btn">Filtrar</button></form></Card>
      <Card pad={false}>
        {rows.length === 0 ? <Empty title="Nenhum cliente encontrado" /> : (
          <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>Cliente</th><th>Contato</th><th className="text-right">Pedidos</th><th className="text-right">Total gasto</th><th className="text-right">Ticket médio</th><th>Última compra</th><th>Marketing</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/clientes/${c.id}`} className="font-medium hover:underline">{c.name}</Link><div className="text-[11px] text-zinc-500">desde {formatDate(c.createdAt)}{c.passwordHash ? " · com conta" : " · visitante"}</div></td>
                <td className="text-xs">{c.email}<div className="text-zinc-500">{c.phone ? formatPhone(c.phone) : ""}</div></td>
                <td className="text-right tabular-nums">{c.ordersCount}</td>
                <td className="text-right tabular-nums">{formatMoney(c.totalSpentCents)}</td>
                <td className="text-right tabular-nums">{c.ordersCount ? formatMoney(Math.round(c.totalSpentCents / c.ordersCount)) : "—"}</td>
                <td className="text-xs">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</td>
                <td>{c.marketingOptIn ? <Badge tone="green">aceita</Badge> : <Badge>não</Badge>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        <Pagination page={page} pages={Math.ceil(total / PER)} total={total} makeHref={(n) => `/admin/clientes${qs(base, { page: n })}`} />
      </Card>
    </>
  );
}
