import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { centsToInput } from "@/lib/action";
import { PageHeader, Card, Badge, Field, Empty } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { dtLocal } from "@/components/admin/dt";
import { saveCoupon, deleteCoupon } from "../../../_actions/marketing";

export const metadata = { title: "Cupons" };

export default async function Coupons({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  await requireAdmin("marketing.manage");
  const { editar } = await searchParams;
  const [list, cats, campaigns] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 30, select: { id: true, name: true } }),
  ]);
  const c = editar ? list.find((x) => x.id === editar) : null;
  const revenue = await prisma.order.groupBy({ by: ["couponCode"], where: { couponCode: { not: null }, paidAt: { not: null } }, _sum: { totalCents: true, discountCents: true } });
  const rev = Object.fromEntries(revenue.map((r) => [r.couponCode, r._sum]));
  const now = new Date();
  const label = (x: (typeof list)[number]) => (x.type === "PERCENT" ? `${(x.value / 100).toLocaleString("pt-BR")}%` : x.type === "FIXED" ? formatMoney(x.value) : "Frete grátis");
  return (
    <>
      <PageHeader title="Cupons" subtitle="Descontos validados no servidor: vigência, limite de usos, valor mínimo, primeira compra e categorias." />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card pad={false}>
          {list.length === 0 ? <Empty title="Nenhum cupom" /> : <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>Código</th><th>Desconto</th><th>Usos</th><th>Vendas com o cupom</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((x) => {
              const live = x.active && (!x.startsAt || x.startsAt <= now) && (!x.endsAt || x.endsAt > now) && (x.maxUses == null || x.usedCount < x.maxUses);
              return <tr key={x.id}><td className="font-mono font-semibold">{x.code}<div className="font-sans text-[11px] font-normal text-zinc-500">{x.description}</div></td><td>{label(x)}{x.minSubtotalCents ? <div className="text-[11px] text-zinc-500">mín. {formatMoney(x.minSubtotalCents)}</div> : null}</td>
                <td className="tabular-nums">{x.usedCount}{x.maxUses ? ` / ${x.maxUses}` : ""}</td><td className="tabular-nums text-xs">{rev[x.code] ? `${formatMoney(rev[x.code].totalCents ?? 0)} (desc. ${formatMoney(rev[x.code].discountCents ?? 0)})` : "—"}</td>
                <td>{live ? <Badge tone="green">Válido</Badge> : <Badge>{x.active ? (x.endsAt && x.endsAt <= now ? "Expirado" : "Fora da vigência") : "Inativo"}</Badge>}{x.endsAt && <div className="text-[11px] text-zinc-500">até {formatDate(x.endsAt)}</div>}</td>
                <td className="text-right"><Link href={`?editar=${x.id}`} className="btn !py-1 text-xs">Editar</Link></td></tr>;
            })}</tbody></table></div>}
        </Card>
        <Card title={c ? `Editar ${c.code}` : "Novo cupom"} actions={c && <Link href="/admin/marketing/cupons" className="text-xs text-zinc-500">+ novo</Link>}>
          <ActionForm action={saveCoupon} className="space-y-3" key={c?.id ?? "new"}>
            {c && <input type="hidden" name="id" value={c.id} />}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código *"><input name="code" defaultValue={c?.code} required className="input font-mono uppercase" /></Field>
              <Field label="Tipo"><select name="type" defaultValue={c?.type ?? "PERCENT"} className="input"><option value="PERCENT">Percentual (%)</option><option value="FIXED">Valor fixo (R$)</option><option value="FREE_SHIPPING">Frete grátis</option></select></Field>
              <Field label="Valor" hint="% ou R$ conforme o tipo."><input name="value" defaultValue={c ? (c.type === "PERCENT" ? String(c.value / 100).replace(".", ",") : centsToInput(c.value)) : ""} className="input" /></Field>
              <Field label="Desconto máximo (R$)"><input name="maxDiscount" defaultValue={centsToInput(c?.maxDiscountCents)} className="input" /></Field>
              <Field label="Compra mínima (R$)"><input name="minSubtotal" defaultValue={centsToInput(c?.minSubtotalCents)} className="input" /></Field>
              <Field label="Limite total de usos"><input name="maxUses" type="number" min={1} defaultValue={c?.maxUses ?? ""} className="input" /></Field>
              <Field label="Usos por cliente"><input name="usesPerCustomer" type="number" min={1} defaultValue={c?.usesPerCustomer ?? ""} className="input" /></Field>
              <Field label="Campanha"><select name="campaignId" defaultValue={c?.campaignId ?? ""} className="input"><option value="">—</option>{campaigns.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select></Field>
              <Field label="Início"><input type="datetime-local" name="startsAt" defaultValue={dtLocal(c?.startsAt)} className="input" /></Field>
              <Field label="Fim"><input type="datetime-local" name="endsAt" defaultValue={dtLocal(c?.endsAt)} className="input" /></Field>
            </div>
            <Field label="Descrição interna"><input name="description" defaultValue={c?.description ?? ""} className="input" /></Field>
            <Field label="Restringir a categorias"><div className="grid grid-cols-2 gap-1 text-sm">{cats.map((k) => <label key={k.id} className="flex items-center gap-2"><input type="checkbox" name="categoryIds" value={k.id} defaultChecked={c?.categoryIds.includes(k.id)} /> {k.name}</label>)}</div></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="firstOrderOnly" defaultChecked={c?.firstOrderOnly} /> Somente primeira compra</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} /> Ativo</label>
            <Submit>Salvar cupom</Submit>
          </ActionForm>
          {c && <div className="mt-3 border-t pt-3"><ActionButton action={deleteCoupon} fields={{ id: c.id }} label="Excluir" className="btn btn-danger" confirm="Excluir cupom? (se já usado, será desativado)" /></div>}
        </Card>
      </div>
    </>
  );
}
