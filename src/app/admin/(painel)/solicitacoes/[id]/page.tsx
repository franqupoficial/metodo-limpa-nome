import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { decryptJson, decryptString } from "@/lib/crypto";
import { serviceMeta } from "@/lib/services";
import { statusDef, statusesFor } from "@/lib/status";
import { formatCep, formatCpf, formatDate, formatMoney, formatPhone, maskCpf } from "@/lib/format";
import { EXPERIENCE_LABEL, LOAN_PAYMENT_LABEL } from "@/lib/schemas";
import { RECURRING_LABEL } from "@/lib/schemas";
import { centsToInput } from "@/lib/action";
import { createPixChargeAction, sendBoletoAction, sendPixChargeAction, setPaymentStatusAction } from "../../../_actions/payments";
import { AdminHeader, DefList, Panel, Empty } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { StatusBadge, Notice } from "@/components/ui";
import { addNoteAction, anonymizeRequestAction, changeStatusAction, regenerateAccessCodeAction } from "../../../_actions/requests";

export const metadata = { title: "Solicitação" };

const STATUS_MAP = { PENDING: ["Aguardando", "bg-amber-100 text-amber-900"], PAID: ["Pago", "bg-emerald-100 text-emerald-800"], CANCELED: ["Cancelado", "bg-slate-100 text-slate-700"], AUTHORIZED: ["Autorizado", "bg-brand-100 text-brand-800"], FAILED: ["Falhou", "bg-red-100 text-red-800"], REFUNDED: ["Estornado", "bg-slate-100 text-slate-700"] };
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
              <DefList rows={[["Valor solicitado", formatMoney(r.amountCents)], ["Vencimento desejado", `Dia ${d.loan?.dueDay}`], ["Pagamento das parcelas", LOAN_PAYMENT_LABEL[d.loan?.paymentMethod as keyof typeof LOAN_PAYMENT_LABEL] ?? "—"], ["Renda informada", d.loan?.monthlyIncome ? formatMoney(Math.round(d.loan.monthlyIncome * 100)) : ""], ["Finalidade", d.loan?.purpose]]} />
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
                  ["Valor mensal", formatMoney(r.monthlyCents)], ["Total estimado", formatMoney(r.amountCents)], ["Data de pagamento", s.paymentDay ? `Dia ${s.paymentDay}` : ""], ["Demais parcelas", s.recurringMethod ? RECURRING_LABEL[s.recurringMethod as keyof typeof RECURRING_LABEL] : ""],
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

          <Panel title="Pagamentos (Pix e boleto)">
            {(() => {
              const paid = r.payments.filter((x) => x.status === "PAID").reduce((t, x) => t + x.amountCents, 0);
              const pend = r.payments.filter((x) => x.status === "PENDING").reduce((t, x) => t + x.amountCents, 0);
              return <p className="mb-3 text-sm">Recebido: <strong className="text-emerald-700">{formatMoney(paid)}</strong> · Em aberto: <strong className="text-amber-700">{formatMoney(pend)}</strong>{s.recurringMethod ? <> · Parcelas recorrentes: <strong>{RECURRING_LABEL[s.recurringMethod as keyof typeof RECURRING_LABEL]}</strong></> : null}</p>;
            })()}
            {r.payments.length ? (
              <div className="overflow-x-auto">
                <table className="table-portal min-w-[640px]">
                  <thead><tr><th>Descrição</th><th>Forma</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead>
                  <tbody>{r.payments.map((pay) => {
                    const [label, cls] = (STATUS_MAP as Record<string, string[]>)[pay.status] ?? [pay.status, ""];
                    return (
                      <tr key={pay.id}>
                        <td className="text-xs">{pay.description ?? "—"}<span className="block text-muted">criada {formatDate(pay.createdAt, true)}{pay.sentAt ? ` · enviada ${formatDate(pay.sentAt, true)}` : ""}</span>{pay.method === "PIX" && pay.providerChargeId && <span className="block font-mono text-[10px] text-muted">txid {pay.providerChargeId}</span>}</td>
                        <td className="text-xs">{pay.method === "PIX" ? "Pix" : pay.method === "BOLETO" ? "Boleto" : pay.method}</td>
                        <td className="whitespace-nowrap text-xs font-semibold">{formatMoney(pay.amountCents)}</td>
                        <td className="text-xs">{formatDate(pay.dueDate)}</td>
                        <td><span className={`badge ${cls}`}>{label}</span>{pay.paidAt && <span className="block text-[10px] text-muted">{formatDate(pay.paidAt, true)} · {pay.confirmedBy}</span>}</td>
                        <td className="space-y-1">
                          {pay.status === "PENDING" && <ActionForm action={setPaymentStatusAction} confirm={`Confirmar recebimento de ${formatMoney(pay.amountCents)}? Verifique no extrato.`}><input type="hidden" name="paymentId" value={pay.id} /><input type="hidden" name="op" value="paid" /><Submit className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700" pendingText="…">Confirmar pagamento</Submit></ActionForm>}
                          {pay.status === "PENDING" && pay.method === "PIX" && !r.anonymizedAt && <ActionForm action={sendPixChargeAction}><input type="hidden" name="paymentId" value={pay.id} /><Submit className="btn-ghost btn-sm" pendingText="…">Enviar por e-mail</Submit></ActionForm>}
                          {pay.status === "PENDING" && <ActionForm action={setPaymentStatusAction} confirm="Cancelar esta cobrança?"><input type="hidden" name="paymentId" value={pay.id} /><input type="hidden" name="op" value="cancel" /><Submit className="btn-ghost btn-sm" pendingText="…">Cancelar</Submit></ActionForm>}
                          {pay.status !== "PENDING" && <ActionForm action={setPaymentStatusAction} confirm="Reabrir esta cobrança como pendente?"><input type="hidden" name="paymentId" value={pay.id} /><input type="hidden" name="op" value="reopen" /><Submit className="btn-ghost btn-sm" pendingText="…">Reabrir</Submit></ActionForm>}
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            ) : <Empty>Nenhuma cobrança registrada.</Empty>}

            {!r.anonymizedAt && (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <ActionForm action={createPixChargeAction} resetOnSuccess className="space-y-2 rounded-lg border border-dashed border-line p-4">
                  <p className="text-sm font-semibold">Nova cobrança Pix</p>
                  <input type="hidden" name="id" value={r.id} />
                  <input name="description" className="input" placeholder="Descrição (ex.: Parcela 2 de 24)" aria-label="Descrição" required />
                  <div className="grid grid-cols-3 gap-2">
                    <input name="amount" className="input" placeholder="Valor" defaultValue={centsToInput(r.monthlyCents ?? r.amountCents)} aria-label="Valor (R$)" required />
                    <input name="installment" type="number" min={1} className="input" placeholder="Nº parcela" aria-label="Número da parcela" />
                    <input name="dueDate" type="date" className="input" aria-label="Vencimento" />
                  </div>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="send" defaultChecked className="accent-brand-700" /> Enviar ao e-mail do cliente</label>
                  <Submit className="btn-primary btn-sm">Gerar Pix</Submit>
                </ActionForm>
                <ActionForm action={sendBoletoAction} resetOnSuccess className="space-y-2 rounded-lg border border-dashed border-line p-4">
                  <p className="text-sm font-semibold">Enviar boleto por e-mail</p>
                  <input type="hidden" name="id" value={r.id} />
                  <input name="description" className="input" placeholder="Descrição (ex.: Parcela 2 de 24)" aria-label="Descrição" required />
                  <div className="grid grid-cols-3 gap-2">
                    <input name="amount" className="input" placeholder="Valor" defaultValue={centsToInput(r.monthlyCents ?? r.amountCents)} aria-label="Valor (R$)" required />
                    <input name="installment" type="number" min={1} className="input" placeholder="Nº parcela" aria-label="Número da parcela" />
                    <input name="dueDate" type="date" className="input" aria-label="Vencimento" required />
                  </div>
                  <input name="file" type="file" accept="application/pdf" className="input text-xs" aria-label="PDF do boleto" required />
                  <p className="text-[11px] text-muted">Gere o boleto no seu banco e anexe o PDF (até 4 MB). Ele é enviado ao cliente e guardado em Documentação.</p>
                  <Submit className="btn-secondary btn-sm" pendingText="Enviando…">Enviar boleto</Submit>
                </ActionForm>
              </div>
            )}
            <div className="mt-4 text-xs text-muted">
              <p>Pix pela chave do portal: confirme cada recebimento conferindo valor e data no extrato. Consentimentos registrados em {formatDate((r.consents as AnyRec).acceptedAt, true)} (versão {(r.consents as AnyRec).policyVersion}): {Object.entries(r.consents as AnyRec).filter(([, v]) => v === true).map(([k]) => k).join(", ")}.</p>
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
