import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { referenceIsStale } from "@/lib/pricing";
import { AdminHeader, Empty } from "@/components/admin/ui";
import { Notice } from "@/components/ui";
import { AVAILABILITY_LABEL } from "@/components/lvb/types";

export const metadata = { title: "Veículos" };

export default async function Veiculos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const where: Prisma.VehicleWhereInput = {};
  if (sp.categoria) where.categoryId = sp.categoria;
  if (sp.situacao === "ativos") where.active = true;
  if (sp.situacao === "inativos") where.active = false;
  if (sp.situacao === "pendentes") where.suggestedCents = { not: null };
  if (sp.disponibilidade) where.availability = sp.disponibilidade as Prisma.VehicleWhereInput["availability"];
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { brand: { contains: q, mode: "insensitive" } }];
  const [vehicles, categories] = await Promise.all([
    prisma.vehicle.findMany({ where, include: { category: true, _count: { select: { requests: true } } }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }] }),
    prisma.vehicleCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <>
      <AdminHeader title="Veículos" subtitle="Gestão da frota e do catálogo LVB. Somente veículos ativos e com preço validado aparecem no site." actions={<Link href="/admin/veiculos/novo" className="btn-primary">+ Adicionar veículo</Link>} />
      {sp.excluido && <div className="mb-4"><Notice tone="success">Veículo excluído.</Notice></div>}
      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-5">
        <input name="q" defaultValue={q} className="input sm:col-span-2" placeholder="Buscar modelo ou marca" aria-label="Buscar" />
        <select name="categoria" defaultValue={sp.categoria ?? ""} className="input" aria-label="Categoria"><option value="">Todas as categorias</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="situacao" defaultValue={sp.situacao ?? ""} className="input" aria-label="Situação"><option value="">Todas as situações</option><option value="ativos">Ativos</option><option value="inativos">Inativos</option><option value="pendentes">Preço pendente</option></select>
        <div className="flex gap-2"><select name="disponibilidade" defaultValue={sp.disponibilidade ?? ""} className="input" aria-label="Disponibilidade"><option value="">Disponibilidade</option>{Object.entries(AVAILABILITY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><button className="btn-primary">Filtrar</button></div>
      </form>
      <div className="card overflow-x-auto">
        {vehicles.length ? (
          <table className="table-portal min-w-[900px]">
            <thead><tr><th>Veículo</th><th>Categoria</th><th>Preço publicado</th><th>Pendente</th><th>Precificação</th><th>Km/mês</th><th>Prazos</th><th>Disponibilidade</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td className="font-medium">{v.brand} {v.name}<span className="block text-xs text-muted">{v._count.requests} solicitação(ões)</span></td>
                  <td className="text-xs">{v.category.name}</td>
                  <td className="text-xs">{v.priceValidatedAt ? formatMoney(v.finalPriceCents) : <span className="text-red-700">Não publicado</span>}</td>
                  <td className="text-xs">{v.suggestedCents ? <span className="badge bg-amber-100 text-amber-900">{formatMoney(v.suggestedCents)}</span> : "—"}</td>
                  <td className="text-xs">{v.pricingMode === "REFERENCE" ? <>Referência −{v.discountPercent}%{referenceIsStale(v.referenceDate) && <span className="block text-amber-700">referência desatualizada</span>}</> : "Manual"}</td>
                  <td className="text-xs">{v.kmPerMonth.toLocaleString("pt-BR")}</td>
                  <td className="text-xs">{v.terms.join("/")}</td>
                  <td className="text-xs">{AVAILABILITY_LABEL[v.availability]}</td>
                  <td>{v.active ? <span className="badge bg-emerald-100 text-emerald-800">Ativo</span> : <span className="badge bg-slate-100 text-slate-700">Inativo</span>}</td>
                  <td><Link href={`/admin/veiculos/${v.id}`} className="btn-secondary btn-sm">Editar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>Nenhum veículo encontrado.</Empty>}
      </div>
    </>
  );
}
