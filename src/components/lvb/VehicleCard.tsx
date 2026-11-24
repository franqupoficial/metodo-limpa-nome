import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { VehicleImage } from "./VehicleImage";
import { AVAILABILITY_LABEL, type ClientVehicle } from "./types";

export function VehicleCard({ v }: { v: ClientVehicle }) {
  return (
    <article className="card-hover flex h-full flex-col overflow-hidden">
      <VehicleImage url={v.imageUrl} category={v.categoryName} caption={v.imageCaption} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="badge bg-lvb-50 text-lvb-700">{v.categoryName}</span>
          <span className={`text-[11px] font-medium ${v.availability === "UNAVAILABLE" ? "text-red-700" : "text-muted"}`}>{AVAILABILITY_LABEL[v.availability]}</span>
        </div>
        <h3 className="mt-3 text-lg font-bold leading-snug">{v.brand} {v.name}</h3>
        <p className="mt-2 text-sm text-muted">A partir de</p>
        <p className="text-2xl font-extrabold text-lvb-700">{formatMoney(v.monthlyCents)}<span className="text-sm font-medium text-muted">/mês</span></p>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li className="flex items-center gap-2"><Icon name="calendar" className="h-4 w-4 text-lvb-600" /> Prazos: {v.terms.join(", ")} meses</li>
          <li className="flex items-center gap-2"><Icon name="shield" className="h-4 w-4 text-lvb-600" /> Seguro, manutenção e IPVA inclusos</li>
          <li className="flex items-center gap-2"><Icon name="gauge" className="h-4 w-4 text-lvb-600" /> {v.kmPerMonth.toLocaleString("pt-BR")} km/mês contratados</li>
          {v.features.slice(0, 3).map((f) => <li key={f} className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-lvb-600" /> {f}</li>)}
          {v.maintenanceInfo && <li className="flex items-center gap-2"><Icon name="settings" className="h-4 w-4 text-lvb-600" /> {v.maintenanceInfo}</li>}
          {v.protectionInfo && <li className="flex items-center gap-2"><Icon name="shield" className="h-4 w-4 text-lvb-600" /> {v.protectionInfo}</li>}
        </ul>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
          <Link href={`/lvb/veiculos/${v.slug}`} className="btn-secondary btn-sm border-lvb-600 text-lvb-700 hover:bg-lvb-50">Ver detalhes</Link>
          {v.availability === "UNAVAILABLE" ? (
            <span className="btn btn-sm cursor-not-allowed bg-surface text-muted">Indisponível</span>
          ) : (
            <Link href={`/lvb/solicitar?veiculo=${v.slug}`} className="btn-lvb btn-sm">Alugar</Link>
          )}
        </div>
      </div>
    </article>
  );
}
