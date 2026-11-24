import Link from "next/link";
import type { ReviewStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, Empty } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit } from "@/components/admin/forms";
import { moderateReview } from "../../_actions/admin-misc";

export const metadata = { title: "Avaliações" };

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string; denunciadas?: string }> }) {
  await requireAdmin("reviews.moderate");
  const sp = await searchParams;
  const status = (sp.status ?? "PENDING") as ReviewStatus;
  const rows = await prisma.review.findMany({
    where: sp.denunciadas ? { reports: { some: { resolvedAt: null } } } : { status },
    orderBy: { createdAt: "desc" }, take: 100,
    include: { product: { select: { id: true, name: true, slug: true } }, reports: { where: { resolvedAt: null } } },
  });
  const counts = Object.fromEntries((await prisma.review.groupBy({ by: ["status"], _count: true })).map((c) => [c.status, c._count]));
  const reported = await prisma.review.count({ where: { reports: { some: { resolvedAt: null } } } });
  const tabs: [string, string, number][] = [["PENDING", "Pendentes", counts.PENDING ?? 0], ["APPROVED", "Aprovadas", counts.APPROVED ?? 0], ["REJECTED", "Reprovadas", counts.REJECTED ?? 0]];
  return (
    <>
      <PageHeader title="Avaliações" subtitle="Somente avaliações reais de clientes. Compras confirmadas recebem o selo “Compra verificada”." />
      <div className="mb-4 flex flex-wrap gap-1">
        {tabs.map(([k, l, n]) => <Link key={k} href={`?status=${k}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!sp.denunciadas && status === k ? "bg-zinc-900 text-[#f3e7cf]" : "bg-white ring-1 ring-zinc-200"}`}>{l} {n}</Link>)}
        <Link href="?denunciadas=1" className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sp.denunciadas ? "bg-red-700 text-white" : "bg-white text-red-700 ring-1 ring-red-200"}`}>Denunciadas {reported}</Link>
      </div>
      {rows.length === 0 ? <Card><Empty title="Nada por aqui" /></Card> : (
        <div className="space-y-3">{rows.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-amber-500">{"★".repeat(r.rating)}<span className="text-zinc-300">{"★".repeat(5 - r.rating)}</span></div>
                <div className="font-semibold">{r.title}</div>
                <p className="mt-1 whitespace-pre-line text-sm text-zinc-700">{r.body}</p>
                <div className="mt-2 text-xs text-zinc-500">{r.authorName} · {formatDate(r.createdAt, true)} · <Link className="underline" href={`/admin/produtos/${r.product.id}`}>{r.product.name}</Link> {r.verified && <Badge tone="green">Compra verificada</Badge>}</div>
                {r.reports.length > 0 && <div className="mt-2 text-xs text-red-700">Denúncias: {r.reports.map((x) => x.reason).join(" · ")}</div>}
              </div>
              <div className="flex gap-1">
                {r.status !== "APPROVED" && <ActionButton action={moderateReview} fields={{ id: r.id, op: "approve" }} label="Aprovar" className="btn btn-primary !py-1 text-xs" />}
                {r.status !== "REJECTED" && <ActionButton action={moderateReview} fields={{ id: r.id, op: "reject" }} label="Reprovar" className="btn !py-1 text-xs" />}
                <ActionButton action={moderateReview} fields={{ id: r.id, op: "delete" }} label="Excluir" className="btn btn-danger !py-1 text-xs" confirm="Excluir avaliação?" />
              </div>
            </div>
            <ActionForm action={moderateReview} className="mt-3 flex gap-2 border-t border-zinc-100 pt-3">
              <input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value="reply" />
              <input name="reply" defaultValue={r.reply ?? ""} placeholder="Resposta pública da Luxer (opcional)" className="input min-w-0 flex-1" />
              <Submit className="btn">Responder</Submit>
            </ActionForm>
          </Card>
        ))}</div>
      )}
    </>
  );
}
