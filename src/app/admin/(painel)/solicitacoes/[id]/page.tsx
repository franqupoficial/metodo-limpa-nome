import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { decryptJson, decryptString } from "@/lib/crypto";
import { serviceMeta } from "@/lib/services";
import { statusDef, statusesFor } from "@/lib/status";
import { formatCep, formatCpf, formatDate, formatMoney, formatPhone, maskCpf } from "@/lib/format";
import { EXPERIENCE_LABEL } from "@/lib/schemas";
import { checkoutEnabled } from "@/lib/payments";
import { AdminHeader, DefList, Panel, Empty } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { StatusBadge, Notice } from "@/components/ui";
import { addNoteAction, anonymizeRequestAction, changeStatusAction, regenerateAccessCodeAction } from "../../../_actions/requests";

export const metadata = { title: "Solicitação" };

type AnyRec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const yn = (b: unknown) => (b ? "Sim" : "Não");
const dmy = (s?: string) => (s ? s.split("-").reverse().join("/") : "");

export default async function RequestDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ revelar?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { revelar } = await searchParams;
  const r = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      customer: true, vehicle: { include: { category: true } },
      history: { orderBy: { createdAt: "desc" }, include: { admin: { select: { name: true } } } },
      notes: { orderBy: { createdAt: "desc" }, include: { admin: { select: { name: true } } } },
      documents: { select: { id: true, kind: true, originalName: true, mime: true, size: true, createdAt: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!r) notFound();

  const showCpf = revelar === "cpf" && !r.anonymizedAt;
  await audit(admin.id, showCpf ? "request.cpf_revealed" : "request.viewed", "ServiceRequest", r.id);

  const d = decryptJson<AnyRec>(r.detailsEnc);
  const meta = serviceMeta(r.service);
  const st = statusDef(r.status);
  const p: AnyRec = d.personal ?? {};
  const a: AnyRec = d.address ?? {};
  const s = (r.summary ?? {}) as AnyRec;

  return (
    <>
      <AdminHeader
        back={{ href: meta.adminHref, label: meta.name }}
        title={`Solicitação ${r.protocol}`}
        subtitle={`${meta.name} · recebida em ${formatDate(r.createdAt, true)}`}
        actions={<StatusBadge label={st.label} tone={st.tone} />}
      />
      {r.anonymizedAt && <div className="mb-4"><Notice tone="warn">Dados pessoais anonimizados em {formatDate(r.anonymizedAt, true)}.</Notice></div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {!r.anonymizedAt && (
            <>
              <Panel title="Dados pessoais" actions={!showCpf && <Link href="?revelar=cpf" className="text-xs font-semibold">Revelar CPF (registrado em auditoria)</Link>}>
                <DefList rows={[
                  ["Nome completo", p.fullName], ["CPF", showCpf ? formatCpf(decryptString(r.customer.cpfEnc)) : maskCpf(r.customer.cpfLast2)],
                  ["Data de nascimento", dmy(p.birthDate)], ["Telefone", formatPhone(p.phone ?? "")], ["E-mail", p.email],
                  ...(p.idDocType ? [["Documento", `${p.idDocType} ${p.idDocNumber}`] as [string, string]] : []),
                ]} />
                <p className="mt-3 text-xs"><Link href={`/admin/clientes/${r.customerId}`}>Ver cadastro do cliente →</Link></p>
              </Panel>
              <Panel title="Endereço">
                <DefList rows={[["CEP", formatCep(a.cep ?? "")], ["Logradouro", `${a.street ?? ""}, ${a.number ?? ""}`], ["Complemento", a.complement], ["Bairro", a.district], ["Cidade/UF", `${a.city ?? ""}/${a.state ?? ""}`]]} />
              </Panel>
            </>
          )}

          {r.service === "CONSUMIDOR" && !r.anonymizedAt && (
            <Panel title="Registros informados">
              <DefList rows={[["Descrição", <span key="d" className="whitespace-pre-line">{d.records?.description}</span>], ["Credores", d.records?.creditors], ["Já contestou", { SIM: "Sim", NAO: "Não", NAO_SEI: "Não sabe" }[d.records?.alreadyContested as string]], ["Pagamento preferido", d.payment?.preference === "PIX" ? "Pix à vista" : "Parcelado"], ["Valor", formatMoney(r.amountCents)]]} />
            </Panel>
          )}

          {r.service === "CNPJ" && !r.anonymizedAt && (
            <Panel title="Dados empresariais">
              <DefList rows={[["Nome fantasia", d.business?.tradeName], ["Tipo", d.business?.businessType], ["Atividade principal", d.business?.mainActivity], ["Atividades secundárias", d.business?.secondaryActivities], ["Forma de atuação", (d.business?.operationModes ?? []).join(", ")], ["Endereço empresarial", d.business?.sameAddress ? "Mesmo do residencial" : d.business?.businessAddress], ["Capital inicial", formatMoney(Math.round((d.business?.initialCapital ?? 0) * 100))], ["Valor do serviço", formatMoney(r.amountCents)]]} />
            </Panel>
          )}

          {r.service === "EMPRESTIMO" && !r.anonymizedAt && (
            <Panel title="Proposta de crédito">
              <DefList rows={[["Valor solicitado", formatMoney(r.amountCents)], ["Vencimento desejado", `Dia ${d.loan?.dueDay}`], ["Renda informada", d.loan?.monthlyIncome ? formatMoney(Math.round(d.loan.monthlyIncome * 100)) : ""], ["Finalidade", d.loan?.purpose]]} />
            </Panel>
          )}

          {r.service === "LVB" && (
            <>
              {!r.anonymizedAt && (
                <>
                  <Panel title="CNH e habilitação">
                    <DefList cols={3} rows={[["Número da CNH", d.license?.cnhNumber], ["Categoria", d.license?.cnhCategory], ["Validade", dmy(d.license?.cnhExpiry)], ["EAR", d.license?.ear === "SIM" ? "Sim" : "Não"], ["Observações", d.license?.notes]]} />
                  </Panel>
                  <Panel title="Informações de motorista">
                    <DefList cols={3} rows={[["Uber", yn(d.driver?.uber)], ["99", yn(d.driver?.app99)], ["Outros apps", d.driver?.others ? d.driver?.othersText || "Sim" : "Não"], ["Experiência", EXPERIENCE_LABEL[d.driver?.experience as keyof typeof EXPERIENCE_LABEL]], ["Plataforma principal", d.driver?.mainPlatform], ["Informações adicionais", d.driver?.notes]]} />
                  </Panel>
                </>
              )}
              <Panel title="Veículo e plano">
                <DefList cols={3} rows={[
                  ["Veículo escolhido", r.vehicle ? <Link key="v" href={`/admin/veiculos/${r.vehicle.id}`}>{r.vehicle.brand} {r.vehicle.name}</Link> : s.vehicle],
                  ["Categoria", s.category], ["Prazo", `${r.termMonths} meses`], ["Quilometragem", s.km],
                  ["Valor mensal", formatMoney(r.monthlyCents)], ["Total estimado", formatMoney(r.amountCents)], ["Data de pagamento", s.paymentDay ? `Dia ${s.paymentDay}` : ""],
                  ["Primeira parcela", formatMoney(r.monthlyCents)],
                ]} />
                <p className="mt-3 text-xs text-muted">Valores calculados no servidor no momento da solicitação, com base no preço validado do veículo.</p>
              </Panel>
            </>
          )}

          <Panel title="Documentação">
            {r.documents.length ? (
              <ul className="divide-y divide-line text-sm">
                {r.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 py-2">
                    <span>{doc.kind} — {doc.originalName} <span className="text-xs text-muted">({Math.round(doc.size / 1024)} KB)</span></span>
                    <a href={`/api/admin/documentos/${doc.id}`} className="btn-secondary btn-sm">Baixar</a>
                  </li>
                ))}
              </ul>
            ) : <Empty>Nenhum documento enviado.</Empty>}
            <p className="mt-2 text-xs text-muted">Arquivos armazenados criptografados. Todo download é registrado em auditoria.</p>
          </Panel>

          <Panel title="Pagamentos e informações contratuais">
            {r.payments.length ? (
              <table className="table-portal"><thead><tr><th>Data</th><th>Método</th><th>Valor</th><th>Status</th><th>ID cobrança</th></tr></thead>
                <tbody>{r.payments.map((pay) => <tr key={pay.id}><td>{formatDate(pay.createdAt)}</td><td>{pay.method}</td><td>{formatMoney(pay.amountCents)}</td><td>{pay.status}</td><td className="font-mono text-xs">{pay.providerChargeId}</td></tr>)}</tbody>
              </table>
            ) : <Empty>{checkoutEnabled() ? "Nenhum pagamento registrado." : "Checkout ainda não habilitado. A estrutura de pagamentos (Pix, cartão, recorrência) está preparada para integração futura."}</Empty>}
            <div className="mt-3 text-xs text-muted">
              <p>Consentimentos registrados em {formatDate((r.consents as AnyRec).acceptedAt, true)} (versão {(r.consents as AnyRec).policyVersion}): {Object.entries(r.consents as AnyRec).filter(([, v]) => v === true).map(([k]) => k).join(", ")}.</p>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Alterar status">
            <ActionForm action={changeStatusAction} className="space-y-3" resetOnSuccess>
              <input type="hidden" name="id" value={r.id} />
              <select name="status" defaultValue={r.status} className="input" aria-label="Novo status">
                {statusesFor(r.service).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
              </select>
              <textarea name="note" className="input" rows={2} placeholder="Observação interna (opcional)" maxLength={2000} />
              <textarea name="publicNote" className="input" rows={2} placeholder="Mensagem visível ao cliente no acompanhamento (opcional — sem dados sensíveis)" maxLength={1000} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" className="accent-brand-700" /> Notificar cliente por e-mail (sem dados sensíveis)</label>
              <Submit className="btn-primary w-full">Salvar status</Submit>
            </ActionForm>
          </Panel>

          <Panel title="Histórico">
            <ol className="space-y-3 border-l-2 border-brand-100 pl-4 text-sm">
              {r.history.map((h) => (
                <li key={h.id}>
                  <p className="font-semibold">{h.fromStatus ? `${statusDef(h.fromStatus).label} → ` : ""}{statusDef(h.toStatus).label}</p>
                  <p className="text-xs text-muted">{formatDate(h.createdAt, true)} · {h.admin?.name ?? "Sistema"}</p>
                  {h.note && <p className="mt-1 text-xs">{h.note}</p>}
                  {h.publicNote && <p className="mt-1 text-xs text-brand-700">Ao cliente: {h.publicNote}</p>}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Observações administrativas">
            <ActionForm action={addNoteAction} resetOnSuccess className="space-y-2">
              <input type="hidden" name="id" value={r.id} />
              <textarea name="content" className="input" rows={3} placeholder="Nova observação" maxLength={4000} required />
              <Submit className="btn-secondary btn-sm">Adicionar</Submit>
            </ActionForm>
            <ul className="mt-4 space-y-3 text-sm">
              {r.notes.map((n) => <li key={n.id} className="rounded-lg bg-surface p-3"><p className="whitespace-pre-line">{n.content}</p><p className="mt-1 text-xs text-muted">{n.admin?.name ?? "—"} · {formatDate(n.createdAt, true)}</p></li>)}
            </ul>
          </Panel>

          <Panel title="Acompanhamento do cliente">
            <p className="text-sm text-muted">Se o cliente perdeu o código de acesso, confirme a identidade antes de gerar um novo.</p>
            <ActionForm action={regenerateAccessCodeAction} className="mt-3" confirm="Gerar novo código? O código anterior deixará de funcionar.">
              <input type="hidden" name="id" value={r.id} />
              <Submit className="btn-secondary btn-sm" pendingText="Gerando…">Gerar novo código de acesso</Submit>
            </ActionForm>
          </Panel>

          {admin.role === "ADMIN" && !r.anonymizedAt && (
            <Panel title="LGPD">
              <p className="text-sm text-muted">Anonimiza os dados pessoais e exclui documentos desta solicitação. Use para atender pedidos de eliminação do titular. Irreversível.</p>
              <ActionForm action={anonymizeRequestAction} className="mt-3" confirm="Anonimizar definitivamente os dados desta solicitação?">
                <input type="hidden" name="id" value={r.id} />
                <Submit className="btn-danger btn-sm" pendingText="Processando…">Anonimizar dados</Submit>
              </ActionForm>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
