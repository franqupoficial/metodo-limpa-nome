import type { Metadata } from "next";
import Link from "next/link";
import { getPublicCategories, getPublicVehicles } from "@/lib/catalog";
import { toClientVehicle, getClientPlanSettings } from "@/lib/lvb";
import { LvbSubnav } from "@/components/lvb/LvbSubnav";
import { VehicleCard } from "@/components/lvb/VehicleCard";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Catálogo de veículos LVB", description: "Veículos para locação por categoria: econômico, compacto, sedan, comfort, SUV e premium/eletrificado.", alternates: { canonical: "/lvb/veiculos" } };
export const dynamic = "force-dynamic";

export default async function Catalogo({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [vehicles, categories, settings] = await Promise.all([getPublicVehicles(), getPublicCategories(), getClientPlanSettings()]);
  const cat = sp.categoria ?? "";
  const max = Number(sp.max ?? 0);
  const prazo = Number(sp.prazo ?? 0);
  const q = (sp.q ?? "").toLowerCase().trim();
  const ordem = sp.ordem ?? "preco";
  let list = vehicles.map(toClientVehicle).filter((v) =>
    (!cat || v.categorySlug === cat) && (!max || v.monthlyCents <= max * 100) && (!prazo || v.terms.includes(prazo)) &&
    (!q || `${v.brand} ${v.name} ${v.categoryName}`.toLowerCase().includes(q)));
  if (ordem === "preco") list = list.sort((a, b) => a.monthlyCents - b.monthlyCents);
  if (ordem === "preco-desc") list = list.sort((a, b) => b.monthlyCents - a.monthlyCents);

  return (
    <>
      <LvbSubnav current="/lvb/veiculos" />
      <PageHero tone="lvb" eyebrow="LVB" title="Catálogo de veículos" subtitle="Filtre por categoria, valor e prazo. Imagens ilustrativas de modelos similares." crumbs={[{ href: "/lvb", label: "LVB" }, { label: "Catálogo" }]} />
      <div className="container-portal grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <form className="card h-fit space-y-4 p-5 lg:sticky lg:top-36" aria-label="Filtros do catálogo">
          <div>
            <label htmlFor="f-q" className="label">Buscar</label>
            <input id="f-q" name="q" defaultValue={sp.q} className="input" placeholder="Modelo ou marca" />
          </div>
          <div>
            <label htmlFor="f-cat" className="label">Categoria</label>
            <select id="f-cat" name="categoria" defaultValue={cat} className="input">
              <option value="">Todas</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-max" className="label">Valor mensal até</label>
            <select id="f-max" name="max" defaultValue={sp.max ?? ""} className="input">
              <option value="">Qualquer valor</option>
              {[1500, 1700, 2000, 2500, 3000].map((m) => <option key={m} value={m}>R$ {m.toLocaleString("pt-BR")}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-prazo" className="label">Prazo</label>
            <select id="f-prazo" name="prazo" defaultValue={sp.prazo ?? ""} className="input">
              <option value="">Todos</option>
              {[12, 24, 36].map((p) => <option key={p} value={p}>{p} meses</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-ordem" className="label">Ordenar</label>
            <select id="f-ordem" name="ordem" defaultValue={ordem} className="input">
              <option value="preco">Menor valor</option>
              <option value="preco-desc">Maior valor</option>
              <option value="categoria">Categoria</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-lvb flex-1" type="submit">Filtrar</button>
            <Link href="/lvb/veiculos" className="btn-ghost">Limpar</Link>
          </div>
        </form>
        <div>
          <p className="mb-4 text-sm text-muted" aria-live="polite">{list.length} {list.length === 1 ? "veículo encontrado" : "veículos encontrados"}</p>
          {list.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{list.map((v) => <VehicleCard key={v.id} v={v} />)}</div>
          ) : (
            <div className="card p-10 text-center text-muted">Nenhum veículo corresponde aos filtros selecionados.</div>
          )}
          <p className="mt-6 text-xs text-muted">{settings.priceNotice}</p>
        </div>
      </div>
    </>
  );
}
