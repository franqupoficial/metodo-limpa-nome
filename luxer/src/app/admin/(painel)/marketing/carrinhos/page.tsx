import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney, maskEmail } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { PageHeader, Card, Badge, Empty, Stat } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { sendRecoveryNow } from "../../../_actions/marketing";

export const metadata = { title: "Carrinhos abandonados" };

export default async function Carts() {
  await requireAdmin("marketing.manage");
  const s = await getSettings();
  const carts = await prisma.cart.findMany({ where: { status: "ABANDONED", items: { some: {} } }, orderBy: { updatedAt: "desc" }, take: 100, include: { items: { include: { variant: { include: { product: { select: { name: true, priceCents: true } } } } } } } });
  const [recovered, emailed] = await Promise.all([prisma.cart.count({ where: { recoveredAt: { not: null } } }), prisma.cart.count({ where: { recoveryEmailAt: { not: null } } })]);
  return (
    <>
      <PageHeader title="Carrinhos abandonados" subtitle={`Recuperação automática ${s.marketing.cartRecoveryEnabled ? `ativa: e-mail ${s.marketing.cartRecoveryDelayHours}h após a última atividade` : "desativada"} (Configurações → Marketing).`} />
      <div className="mb-5 grid grid-cols-3 gap-3"><Stat label="Abandonados (lista)" value={carts.length} /><Stat label="E-mails de recuperação" value={emailed} /><Stat label="Recuperados" value={recovered} hint={emailed ? `${((recovered / emailed) * 100).toFixed(1)}% dos e-mails` : undefined} /></div>
      <Card pad={false}>{carts.length === 0 ? <Empty title="Nenhum carrinho abandonado" /> : <div className="overflow-x-auto"><table className="tbl">
        <thead><tr><th>Última atividade</th><th>Cliente</th><th>Itens</th><th className="text-right">Valor</th><th>Recuperação</th><th /></tr></thead>
        <tbody>{carts.map((c) => {
          const total = c.items.reduce((a, i) => a + (i.variant.priceCents ?? i.variant.product.priceCents) * i.quantity, 0);
          return <tr key={c.id}><td className="whitespace-nowrap text-xs">{formatDate(c.updatedAt, true)}</td><td className="text-xs">{c.name ?? "—"}<div className="text-zinc-500">{c.email ? maskEmail(c.email) : "sem e-mail"}</div></td>
            <td className="text-xs">{c.items.map((i) => i.variant.product.name).join(", ")}</td><td className="text-right tabular-nums">{formatMoney(total)}</td>
            <td>{c.recoveredAt ? <Badge tone="green">Recuperado</Badge> : c.recoveryEmailAt ? <Badge tone="blue">E-mail {formatDate(c.recoveryEmailAt)}</Badge> : <Badge>Pendente</Badge>}</td>
            <td className="text-right">{c.email && !c.recoveredAt && <ActionButton action={sendRecoveryNow} fields={{ id: c.id }} label="Enviar e-mail" className="btn !py-1 text-xs" />}</td></tr>;
        })}</tbody></table></div>}</Card>
    </>
  );
}
