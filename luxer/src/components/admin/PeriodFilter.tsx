import Link from "next/link";

const OPTS = [["hoje", "Hoje"], ["ontem", "Ontem"], ["7d", "7 dias"], ["30d", "30 dias"], ["90d", "90 dias"], ["mes", "Este mês"]] as const;

export function PeriodFilter({ base, current, de, ate }: { base: string; current: string; de?: string; ate?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap rounded-lg border border-zinc-200 bg-white p-0.5">
        {OPTS.map(([k, l]) => (
          <Link key={k} href={`${base}?periodo=${k}`} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${current === k ? "bg-zinc-900 text-[#f3e7cf]" : "text-zinc-600 hover:bg-zinc-100"}`}>{l}</Link>
        ))}
      </div>
      <form action={base} className="flex flex-wrap items-center gap-1">
        <input type="hidden" name="periodo" value="custom" />
        <input type="date" name="de" defaultValue={de} className="input !w-[8.5rem] !py-1.5 text-xs" aria-label="De" required />
        <span className="text-xs text-zinc-400">até</span>
        <input type="date" name="ate" defaultValue={ate} className="input !w-[8.5rem] !py-1.5 text-xs" aria-label="Até" required />
        <button className={`btn !py-1.5 text-xs ${current === "custom" ? "btn-primary" : ""}`}>Aplicar</button>
      </form>
    </div>
  );
}
