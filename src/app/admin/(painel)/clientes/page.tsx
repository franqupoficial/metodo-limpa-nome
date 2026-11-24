import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { keyedHash } from "@/lib/crypto";
import { serviceMeta } from "@/lib/services";
import { formatDate, formatPhone, maskCpf, onlyDigits } from "@/lib/format";
import { AdminHeader, Empty, Pagination } from "@/components/admin/ui";

export const metadata = { title: "Clientes" };
const PER_PAGE = 30;

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.pagina) || 1);
  const digits = onlyDigits(q);
  const where: Prisma.CustomerWhereInput = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q.toLowerCase() } }, ...(digits.length === 11 ? [{ cpfHash: keyedHash(`cpf:${digits}`) }, { phone: digits }] : []), ...(digits.length === 10 ? [{ phone: digits }] : [])] }
    : {};
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { requests: { select: { service: true, status: true, protocol: true } } } }),
    prisma.customer.count({ where }),
  ]);
  return (
    <>
      <AdminHeader title="Clientes" subtitle={`${total} cliente(s) cadastrados. CPF exibido mascarado; acesso integral é auditado.`} />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} className="input max-w-md" placeholder="Nome, e-mail, CPF completo ou telefone" aria-label="Buscar" />
        <button className="btn-primary">Buscar</button>
      </form>
      <div className="card overflow-x-auto">
        {rows.length ? (
          <table className="table-portal min-w-[800px]">
            <thead><tr><th>Nome</th><th>CPF</th><th>E-mail</th><th>Telefone</th><th>Serviços</th><th>Protocolos</th><th>Cadastro</th><th></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="font-mono text-xs">{maskCpf(c.cpfLast2)}</td>
                  <td className="text-xs">{c.email}</td>
                  <td className="whitespace-nowrap text-xs">{formatPhone(c.phone)}</td>
                  <td className="text-xs">{[...new Set(c.requests.map((r) => serviceMeta(r.service).short))].join(", ")}</td>
                  <td className="text-xs">{c.requests.length}</td>
                  <td className="whitespace-nowrap text-xs">{formatDate(c.createdAt)}</td>
                  <td><Link href={`/admin/clientes/${c.id}`} className="btn-secondary btn-sm">Abrir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>Nenhum cliente encontrado.</Empty>}
      </div>
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} makeHref={(p) => `/admin/clientes?${new URLSearchParams({ q, pagina: String(p) })}`} />
    </>
  );
}
