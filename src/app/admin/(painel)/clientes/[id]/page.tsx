import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { serviceMeta } from "@/lib/services";
import { statusDef } from "@/lib/status";
import { formatDate, formatMoney, formatPhone, maskCpf } from "@/lib/format";
import { AdminHeader, DefList, Panel } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui";

export const metadata = { title: "Cliente" };

export default async function Cliente({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const c = await prisma.customer.findUnique({
    where: { id },
    include: { requests: { orderBy: { createdAt: "desc" }, include: { history: { orderBy: { createdAt: "desc" }, take: 1 } } } },
  });
  if (!c) notFound();
  await audit(admin.id, "customer.viewed", "Customer", c.id);
  return (
    <>
      <AdminHeader back={{ href: "/admin/clientes", label: "Clientes" }} title={c.name} subtitle={`Cliente desde ${formatDate(c.createdAt)}`} />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Panel title="Cadastro">
          <DefList cols={2} rows={[["CPF", maskCpf(c.cpfLast2)], ["E-mail", c.email], ["Telefone", formatPhone(c.phone)], ["Solicitações", String(c.requests.length)], ["Atualizado", formatDate(c.updatedAt, true)]]} />
          <p className="mt-3 text-xs text-muted">O CPF completo pode ser revelado na página de cada solicitação, com registro em auditoria.</p>
        </Panel>
        <Panel title="Histórico de solicitações">
          <div className="overflow-x-auto">
            <table className="table-portal">
              <thead><tr><th>Protocolo</th><th>Serviço</th><th>Data</th><th>Valor</th><th>Status</th><th>Última atualização</th></tr></thead>
              <tbody>
                {c.requests.map((r) => {
                  const st = statusDef(r.status);
                  return (
                    <tr key={r.id}>
                      <td><Link href={`/admin/solicitacoes/${r.id}`} className="font-mono text-xs font-semibold">{r.protocol}</Link></td>
                      <td className="text-xs">{serviceMeta(r.service).short}</td>
                      <td className="text-xs">{formatDate(r.createdAt)}</td>
                      <td className="text-xs">{formatMoney(r.service === "LVB" ? r.monthlyCents : r.amountCents)}{r.service === "LVB" ? "/mês" : ""}</td>
                      <td><StatusBadge label={st.label} tone={st.tone} /></td>
                      <td className="text-xs">{formatDate(r.history[0]?.createdAt ?? r.updatedAt, true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
