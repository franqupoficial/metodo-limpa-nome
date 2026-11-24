import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { TRIGGERS, flowAudience, ensureDefaultFlows, whatsappLink, fillTemplate, type FlowConfig } from "@/lib/remarketing";
import { BUILTIN_SEGMENTS } from "@/lib/segments";
import { mailConfigured } from "@/lib/mail";
import { centsToInput } from "@/lib/action";
import { PageHeader, Card, Stat, Badge, Field, Alert, Empty } from "@/components/admin/ui";
import { ActionForm, ActionButton, Submit, Collapsible } from "@/components/admin/forms";
import { saveFlow, runFlowNow, launchRecovery, whatsappDone } from "../../../_actions/remarketing";

export const metadata = { title: "Remarketing" };
const DAY = 86_400_000;

export default async function Remarketing() {
  await requireAdmin("marketing.manage");
  await ensureDefaultFlows();
  const since = new Date(Date.now() - 30 * DAY);
  const [flows, sends30, clicks30, conv30, queue, recent, customSegs] = await Promise.all([
    prisma.automationFlow.findMany({ orderBy: [{ trigger: "asc" }, { createdAt: "desc" }] }),
    prisma.automationSend.count({ where: { createdAt: { gte: since }, status: { not: "SKIPPED" } } }),
    prisma.automationSend.count({ where: { createdAt: { gte: since }, clickedAt: { not: null } } }),
    prisma.automationSend.aggregate({ where: { createdAt: { gte: since }, convertedOrderId: { not: null } }, _count: true, _sum: { revenueCents: true } }),
    prisma.automationSend.findMany({ where: { channel: "WHATSAPP", status: "QUEUED" }, orderBy: { createdAt: "asc" }, take: 50, include: { customer: { select: { name: true, phone: true } }, flow: true } }),
    prisma.automationSend.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { flow: { select: { name: true } }, customer: { select: { name: true, id: true } } } }),
    prisma.customerSegment.findMany({ orderBy: { name: "asc" } }),
  ]);
  const discount = await prisma.order.aggregate({ where: { id: { in: (await prisma.automationSend.findMany({ where: { createdAt: { gte: since }, convertedOrderId: { not: null } }, select: { convertedOrderId: true } })).map((x) => x.convertedOrderId!) } }, _sum: { discountCents: true } });
  const stats = await prisma.automationSend.groupBy({ by: ["flowId"], _count: true, _sum: { revenueCents: true } });
  const convBy = await prisma.automationSend.groupBy({ by: ["flowId"], where: { convertedOrderId: { not: null } }, _count: true });
  const st = Object.fromEntries(stats.map((x) => [x.flowId, x]));
  const cv = Object.fromEntries(convBy.map((x) => [x.flowId, x._count]));
  const audiences = Object.fromEntries(await Promise.all(flows.filter((f) => f.trigger !== "MANUAL").map(async (f) => [f.id, (await flowAudience(f.trigger, f.config as FlowConfig, 1)).total] as const)));
  const consented = await Promise.all([
    prisma.customer.count({ where: { anonymizedAt: null, marketingOptIn: true } }),
    prisma.customer.count({ where: { anonymizedAt: null, OR: [{ whatsappOptIn: true }, { smsOptIn: true }], phone: { not: null } } }),
  ]);
  const revenue = conv30._sum.revenueCents ?? 0;
  const segs: [string, string][] = [["", "Toda a base (com consentimento)"], ...Object.entries(BUILTIN_SEGMENTS).map(([k, v]) => [k, v.name] as [string, string]), ...customSegs.map((s) => [s.id, s.name] as [string, string])];

  return (
    <>
      <PageHeader title="Remarketing automático" subtitle="Fluxos que recuperam clientes sozinhos — com cupom pessoal de uso único, recomendações reais e atribuição de receita." />
      {!mailConfigured() && <div className="mb-4"><Alert>SMTP não configurado: os e-mails são registrados, mas não entregues. Configure o provedor de e-mail antes de ativar os fluxos.</Alert></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Mensagens (30 dias)" value={sends30} />
        <Stat label="Cliques" value={clicks30} hint={sends30 ? `${((clicks30 / sends30) * 100).toFixed(1)}% dos envios` : undefined} />
        <Stat label="Vendas recuperadas" value={conv30._count} />
        <Stat label="Receita atribuída" value={formatMoney(revenue)} hint="pedidos pagos com o cupom ou após clique (7 dias)" />
        <Stat label="Retorno sobre desconto" value={discount._sum.discountCents ? `${(revenue / discount._sum.discountCents).toFixed(1)}×` : "—"} hint={`descontos concedidos ${formatMoney(discount._sum.discountCents ?? 0)}`} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">Base com consentimento: {consented[0]} para e-mail · {consented[1]} para WhatsApp/SMS. Somente quem consentiu recebe mensagens.</p>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700">Fluxos automáticos</h2>
          {flows.filter((f) => f.trigger !== "MANUAL").map((f) => {
            const c = f.config as FlowConfig;
            return (
              <Collapsible key={f.id} title={`${f.active ? "● " : "○ "}${f.name} — ${TRIGGERS[f.trigger]?.label} · público ${audiences[f.id] ?? 0} · ${st[f.id]?._count ?? 0} envio(s) · ${cv[f.id] ?? 0} venda(s) · ${formatMoney(st[f.id]?._sum.revenueCents ?? 0)}`}>
                <p className="mb-3 text-xs text-zinc-500">{TRIGGERS[f.trigger]?.description} {f.lastRunAt && `Última execução: ${formatDate(f.lastRunAt, true)}.`}</p>
                <ActionForm action={saveFlow} className="grid gap-3 sm:grid-cols-4">
                  <input type="hidden" name="id" value={f.id} />
                  <Field label="Nome" className="sm:col-span-2"><input name="name" defaultValue={f.name} className="input" /></Field>
                  <Field label="Canal"><select name="channel" defaultValue={c.channel ?? "EMAIL"} className="input"><option value="EMAIL">E-mail</option><option value="WHATSAPP">WhatsApp (fila)</option><option value="BOTH">E-mail + WhatsApp</option></select></Field>
                  <label className="flex items-center gap-2 self-end text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={f.active} /> Ativo</label>
                  {f.trigger === "WINBACK" && <Field label="Inativo há (dias)"><input name="inactiveDays" type="number" defaultValue={c.inactiveDays} className="input" /></Field>}
                  {["POST_PURCHASE", "WELCOME"].includes(f.trigger) && <Field label="Enviar após (dias)"><input name="delayDays" type="number" defaultValue={c.delayDays} className="input" /></Field>}
                  {f.trigger === "VIP" && <Field label="Gasto mínimo (R$)"><input name="minSpent" defaultValue={centsToInput(c.minSpentCents)} className="input" /></Field>}
                  <Field label="Cupom (%)" hint="0 = sem cupom"><input name="couponPercent" defaultValue={c.couponPercent ?? 0} className="input" /></Field>
                  <Field label="Validade (dias)"><input name="couponDays" type="number" defaultValue={c.couponDays ?? 15} className="input" /></Field>
                  <Field label="Lembrete após (dias)" hint="vazio = sem lembrete"><input name="followUpDays" type="number" defaultValue={c.followUpDays ?? ""} className="input" /></Field>
                  <Field label="Envios por execução"><input name="batchPerRun" type="number" defaultValue={c.batchPerRun ?? 80} className="input" /></Field>
                  <Field label="Assunto" className="sm:col-span-4"><input name="subject" defaultValue={c.subject} className="input" /></Field>
                  <Field label="Mensagem" className="sm:col-span-4" hint="Variáveis: {nome} {cupom} {desconto} {validade} {loja}. Parágrafos separados por linha em branco. O e-mail inclui automaticamente o cupom, 3 recomendações do catálogo e o link de descadastro."><textarea name="body" defaultValue={c.body} rows={4} className="input" /></Field>
                  <Field label="Assunto do lembrete" className="sm:col-span-2"><input name="reminderSubject" defaultValue={c.reminderSubject ?? ""} className="input" /></Field>
                  <Field label="Mensagem do lembrete" className="sm:col-span-2"><input name="reminderBody" defaultValue={c.reminderBody ?? ""} className="input" /></Field>
                  <Field label="Botão"><input name="ctaLabel" defaultValue={c.ctaLabel ?? ""} className="input" /></Field>
                  <Field label="Link do botão"><input name="ctaUrl" defaultValue={c.ctaUrl ?? "/"} className="input" /></Field>
                  <Field label="Texto do WhatsApp" className="sm:col-span-2"><input name="whatsappText" defaultValue={c.whatsappText ?? ""} className="input" /></Field>
                  <div className="flex gap-2 sm:col-span-4"><Submit>Salvar fluxo</Submit></div>
                </ActionForm>
                <div className="mt-3 border-t border-zinc-100 pt-3"><ActionButton action={runFlowNow} fields={{ id: f.id }} label="Executar agora (um lote)" className="btn" confirm={`Enviar agora para até ${c.batchPerRun ?? 80} cliente(s) elegível(is)?`} /></div>
              </Collapsible>
            );
          })}
        </div>

        <div className="space-y-5">
          <Card title="Recuperar clientes agora">
            <ActionForm action={launchRecovery} className="space-y-3">
              <Field label="Nome da campanha"><input name="name" defaultValue="Recuperação de clientes" className="input" /></Field>
              <Field label="Público"><select name="segmentId" className="input">{segs.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Cupom %"><input name="couponPercent" defaultValue="10" className="input" /></Field>
                <Field label="Validade"><input name="couponDays" type="number" defaultValue={10} className="input" /></Field>
                <Field label="Canal"><select name="channel" className="input"><option value="EMAIL">E-mail</option><option value="BOTH">E-mail + WhatsApp</option><option value="WHATSAPP">WhatsApp</option></select></Field>
              </div>
              <Field label="Assunto"><input name="subject" defaultValue="{nome}, temos um convite para você" className="input" /></Field>
              <Field label="Mensagem"><textarea name="body" rows={4} defaultValue={"Preparamos uma condição especial para você voltar a brilhar com a Luxer: {desconto} de desconto em qualquer joia até {validade}."} className="input" /></Field>
              <Field label="Texto do WhatsApp"><input name="whatsappText" defaultValue="Olá, {nome}! Aqui é da Luxer Joias. Separamos um cupom exclusivo de {desconto} para você: {cupom} (até {validade})." className="input" /></Field>
              <Field label="Lembrete após (dias)"><input name="followUpDays" type="number" defaultValue={5} className="input" /></Field>
              <input type="hidden" name="reminderSubject" value="Último aviso: seu cupom {cupom} expira em breve" />
              <input type="hidden" name="reminderBody" value="O cupom {cupom} ({desconto}) vale até {validade}. É pessoal e de uso único." />
              <Submit confirm="Iniciar a campanha de recuperação? Os envios começam agora, em lotes.">Iniciar campanha</Submit>
            </ActionForm>
            {flows.filter((f) => f.trigger === "MANUAL").length > 0 && (
              <ul className="mt-4 space-y-1 border-t border-zinc-100 pt-3 text-xs">{flows.filter((f) => f.trigger === "MANUAL").map((f) => <li key={f.id} className="flex justify-between"><span>{f.name} · {formatDate(f.createdAt)}</span><span>{st[f.id]?._count ?? 0} envio(s) · {cv[f.id] ?? 0} venda(s) · {formatMoney(st[f.id]?._sum.revenueCents ?? 0)} {f.active ? <Badge tone="blue">enviando</Badge> : <Badge>concluída</Badge>}</span></li>)}</ul>
            )}
          </Card>

          <Card title={`Fila de WhatsApp (${queue.length})`} pad={false}>
            {queue.length === 0 ? <Empty title="Nada na fila">Mensagens de WhatsApp dos fluxos aparecem aqui para a equipe enviar com um toque.</Empty> : (
              <ul className="divide-y divide-zinc-100">{queue.map((q) => {
                const c = q.flow.config as FlowConfig;
                const text = fillTemplate(c.whatsappText ?? c.body, { nome: q.customer?.name.split(" ")[0] ?? "", cupom: q.couponCode ?? "", desconto: c.couponPercent ? `${c.couponPercent}%` : "", validade: "", loja: "Luxer Joias" });
                return (
                  <li key={q.id} className="space-y-1.5 p-3 text-xs">
                    <div className="flex justify-between"><b>{q.customer?.name}</b><span className="text-zinc-500">{q.flow.name}</span></div>
                    <p className="text-zinc-600">{text}</p>
                    <div className="flex gap-1">
                      {q.customer?.phone && <a href={whatsappLink(q.customer.phone, text)} target="_blank" rel="noreferrer" className="btn !py-1 text-xs">Abrir WhatsApp</a>}
                      <ActionButton action={whatsappDone} fields={{ id: q.id }} label="Enviado ✓" className="btn !py-1 text-xs" />
                      <ActionButton action={whatsappDone} fields={{ id: q.id, op: "skip" }} label="Pular" className="btn !py-1 text-xs" />
                    </div>
                  </li>
                );
              })}</ul>
            )}
          </Card>
        </div>
      </div>

      <Card title="Últimos envios" className="mt-6" pad={false}>
        {recent.length === 0 ? <Empty title="Nenhum envio ainda" /> : <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Data</th><th>Fluxo</th><th>Cliente</th><th>Canal</th><th>Cupom</th><th>Clique</th><th>Venda</th></tr></thead><tbody>
          {recent.map((r) => <tr key={r.id}><td className="whitespace-nowrap text-xs">{formatDate(r.createdAt, true)}</td><td className="text-xs">{r.flow.name}{r.step > 1 ? " (lembrete)" : ""}</td><td className="text-xs">{r.customer ? <Link className="hover:underline" href={`/admin/clientes/${r.customer.id}`}>{r.customer.name}</Link> : r.email}</td><td className="text-xs">{r.channel === "EMAIL" ? "E-mail" : `WhatsApp · ${r.status === "QUEUED" ? "na fila" : r.status === "DONE" ? "enviado" : "pulado"}`}</td><td className="font-mono text-xs">{r.couponCode ?? "—"}</td><td className="text-xs">{r.clickedAt ? formatDate(r.clickedAt, true) : "—"}</td><td className="text-xs">{r.convertedOrderId ? <Link className="text-emerald-700 underline" href={`/admin/pedidos/${r.convertedOrderId}`}>{formatMoney(r.revenueCents)}</Link> : "—"}</td></tr>)}
        </tbody></table></div>}
      </Card>
    </>
  );
}
