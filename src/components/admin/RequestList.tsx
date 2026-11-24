import Link from "next/link";
import type { Prisma, ServiceType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { keyedHash } from "@/lib/crypto";
import { serviceMeta } from "@/lib/services";
import { statusDef, statusesFor } from "@/lib/status";
import { formatDate, formatMoney, formatPhone, maskCpf, onlyDigits } from "@/lib/format";
import { StatusBadge } from "@/components/ui";
import { AdminHeader, Empty, Pagination } from "./ui";

const PER_PAGE = 25;

export async function RequestList({ service, sp }: { service: ServiceType; sp: Record<string, string | undefined> }) {
  const meta = serviceMeta(service);
  const page = Math.max(1, Number(sp.pagina) || 1);
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";
  const where: Prisma.ServiceRequestWhereInput = { service };
  if (status) where.status = status;
  if (q) {
    const digits = onlyDigits(q);
    where.OR = [
      { protocol: { contains: q.toUpperCase() } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { email: { contains: q.toLowerCase() } } },
      ...(digits.length === 11 ? [{ customer: { cpfHash: keyedHash(`cpf:${digits}`) } }] : []),
      ...(digits.length >= 8 && digits.length <= 11 ? [{ customer: { phone: { contains: digits } } }] : []),
    ];
  }
  const [rows, total, counts] = await Promise.all([
    prisma.serviceRequest.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { customer: true } }),
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.groupBy({ by: ["status"], where: { service }, _count: true }),
  ]);
  const pages = Math.ceil(total / PER_PAGE);
  const isLvb = service === "LVB";
  const href = (p: Record<string, string | number>) => `${meta.adminHref}?${new URLSearchParams(Object.entries({ q, status, ...p }).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))}`;

  return (
    <>
      <AdminHeader title={meta.name} subtitle={`${total} solicitação(ões)`} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={href({ status: "", pagina: 1 })} className={`badge px-3 py-1 text-xs no-underline ${!status ? "bg-brand-700 text-white" : "border border-line bg-white text-ink"}`}>Todas</Link>
        {statusesFor(service).map((s) => {
          const c = counts.find((x) => x.status === s.key)?._count ?? 0;
          return <Link key={s.key} href={href({ status: s.key, pagina: 1 })} className={`badge px-3 py-1 text-xs no-underline ${status === s.key ? "bg-brand-700 text-white" : "border border-line bg-white text-ink"}`}>{s.label} ({c})</Link>;
        })}
      </div>
      <form className="mb-4 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} className="input max-w-md" placeholder="Buscar por protocolo, nome, e-mail, CPF ou telefone" aria-label="Buscar" />
        <button className="btn-primary">Buscar</button>
      </form>
      <div className="card overflow-x-auto">
        {rows.length ? (
          <table className="table-portal min-w-[900px]">
            <thead>
              <tr>
                <th>Protocolo</th><th>Data</th><th>Nome</th><th>CPF</th><th>Telefone</th><th>E-mail</th>
                {isLvb ? <><th>Veículo</th><th>Categoria</th><th>Prazo</th><th>Mensal</th></> : <th>Valor</th>}
                <th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = statusDef(r.status);
                const s = (r.summary ?? {}) as Record<string, string | number>;
                return (
                  <tr key={r.id}>
                    <td className="font-mono text-xs font-semibold">{r.protocol}</td>
                    <td className="whitespace-nowrap text-xs">{formatDate(r.createdAt, true)}</td>
                    <td>{r.anonymizedAt ? <em className="text-muted">Anonimizado</em> : r.customer.name}</td>
                    <td className="font-mono text-xs">{maskCpf(r.customer.cpfLast2)}</td>
                    <td className="whitespace-nowrap text-xs">{formatPhone(r.customer.phone)}</td>
                    <td className="text-xs">{r.customer.email}</td>
                    {isLvb ? (
                      <><td className="text-xs">{s.vehicle}</td><td className="text-xs">{s.category}</td><td className="text-xs">{r.termMonths} m</td><td className="whitespace-nowrap text-xs">{formatMoney(r.monthlyCents)}</td></>
                    ) : <td className="whitespace-nowrap text-xs">{formatMoney(r.amountCents)}</td>}
                    <td><StatusBadge label={st.label} tone={st.tone} /></td>
                    <td><Link href={`/admin/solicitacoes/${r.id}`} className="btn-secondary btn-sm">Abrir</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <Empty>Nenhuma solicitação encontrada.</Empty>}
      </div>
      <Pagination page={page} pages={pages} makeHref={(p) => href({ pagina: p })} />
    </>
  );
}
