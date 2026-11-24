import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { providerConfigured } from "@/lib/ai/tryon";
import { formatDate, formatMoney } from "@/lib/format";
import { centsToInput } from "@/lib/action";
import { PageHeader, Card, Stat, Badge, Field, Alert, Empty } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/forms";
import { saveSettings } from "../../_actions/settings";

export const metadata = { title: "Luxer AI" };
const CATS: [string, string][] = [["colares", "Colares"], ["correntes", "Correntes"], ["pingentes", "Pingentes"], ["brincos", "Brincos"], ["pulseiras", "Pulseiras"], ["aneis", "Anéis"]];

export default async function LuxerAI() {
  const admin = await requireAdmin("ai.view");
  const s = (await getSettings()).ai;
  const monthStart = new Date(new Date().toISOString().slice(0, 8) + "01T03:00:00Z");
  const dayStart = new Date(Date.now() - 86400000);
  const [month, byStatus, day, recent, errors, top] = await Promise.all([
    prisma.tryOnRequest.aggregate({ where: { createdAt: { gte: monthStart } }, _count: true, _sum: { costCents: true }, _avg: { durationMs: true } }),
    prisma.tryOnRequest.groupBy({ by: ["status"], where: { createdAt: { gte: monthStart } }, _count: true }),
    prisma.tryOnRequest.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.tryOnRequest.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { product: { select: { name: true, id: true } } } }),
    prisma.tryOnRequest.findMany({ where: { status: { in: ["FAILED", "BLOCKED"] } }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.tryOnRequest.groupBy({ by: ["productId"], where: { createdAt: { gte: monthStart }, productId: { not: null } }, _count: true, orderBy: { _count: { productId: "desc" } }, take: 5 }),
  ]);
  const st = Object.fromEntries(byStatus.map((b) => [b.status, b._count])) as Record<string, number>;
  const topNames = Object.fromEntries((await prisma.product.findMany({ where: { id: { in: top.map((t) => t.productId!) } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  const configured = providerConfigured(s.provider);
  return (
    <>
      <PageHeader title="Luxer AI" subtitle="LUXER AI TRY-ON — provador virtual de joias com IA generativa." />
      {!configured && <div className="mb-4"><Alert>O provedor <b>{s.provider === "gemini" ? "Google Gemini" : "OpenAI"}</b> não tem credencial configurada ({s.provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY"}). O provador fica indisponível na loja, exibindo a mensagem de indisponibilidade.</Alert></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Status" value={s.tryOnEnabled && configured ? "Ativo" : "Inativo"} hint={s.tryOnEnabled ? (configured ? s.model : "sem credencial") : "desligado no painel"} />
        <Stat label="Simulações no mês" value={month._count} hint={`${day} nas últimas 24h`} />
        <Stat label="Sucesso / falha" value={`${st.SUCCEEDED ?? 0} / ${(st.FAILED ?? 0) + (st.BLOCKED ?? 0)}`} />
        <Stat label="Custo estimado no mês" value={formatMoney(month._sum.costCents ?? 0)} hint={`orçamento ${formatMoney(s.monthlyBudgetCents)}`} />
        <Stat label="Tempo médio" value={month._avg.durationMs ? `${(month._avg.durationMs / 1000).toFixed(1)} s` : "—"} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_460px]">
        <div className="space-y-5">
          <Card title="Solicitações recentes" pad={false}>{recent.length === 0 ? <Empty title="Nenhuma simulação ainda" /> : <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>Data</th><th>Peça</th><th>Categoria</th><th>Provedor</th><th>Status</th><th className="text-right">Tempo</th></tr></thead>
            <tbody>{recent.map((r) => <tr key={r.id}><td className="whitespace-nowrap text-xs">{formatDate(r.createdAt, true)}</td><td className="text-xs">{r.product ? <Link className="hover:underline" href={`/admin/produtos/${r.product.id}`}>{r.product.name}</Link> : "—"}</td><td className="text-xs">{r.category}</td><td className="text-xs">{r.provider} · {r.model}</td>
              <td><Badge tone={r.status === "SUCCEEDED" ? "green" : r.status === "PROCESSING" ? "blue" : "red"}>{r.status}</Badge></td><td className="text-right text-xs tabular-nums">{r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : "—"}</td></tr>)}</tbody></table></div>}</Card>
          <Card title="Erros recentes" pad={false}>{errors.length === 0 ? <Empty title="Nenhum erro" /> : <table className="tbl"><tbody>{errors.map((e) => <tr key={e.id}><td className="whitespace-nowrap text-xs">{formatDate(e.createdAt, true)}</td><td className="font-mono text-xs">{e.errorCode}</td><td className="text-xs text-zinc-600">{e.errorMessage}</td></tr>)}</tbody></table>}</Card>
          <Card title="Peças mais experimentadas no mês">{top.length ? <ul className="text-sm">{top.map((t) => <li key={t.productId} className="flex justify-between"><span>{topNames[t.productId!]}</span><span>{t._count}</span></li>)}</ul> : <p className="text-sm text-zinc-500">Sem dados.</p>}</Card>
          <Alert tone="blue"><b>Privacidade:</b> a foto do cliente é processada em memória, enviada ao provedor apenas para gerar a simulação e não é gravada. O resultado só é armazenado se a retenção abaixo for maior que zero (e é apagado automaticamente no prazo). O registro guarda somente métricas técnicas e um identificador anônimo diário.</Alert>
        </div>
        <Card title="Configuração">
          {!admin.can("ai.manage") ? <p className="text-sm text-zinc-500">Somente leitura para o seu perfil.</p> : (
            <ActionForm action={saveSettings} className="space-y-3"><input type="hidden" name="group" value="ai" />
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="tryOnEnabled" defaultChecked={s.tryOnEnabled} /> Provador ativo na loja</label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Provedor"><select name="provider" defaultValue={s.provider} className="input"><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select></Field>
                <Field label="Modelo"><input name="model" defaultValue={s.model} className="input font-mono text-xs" /></Field>
              </div>
              <Field label="Categorias disponíveis"><div className="grid grid-cols-3 gap-1 text-sm">{CATS.map(([k, l]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" name="categories" value={k} defaultChecked={s.categories.includes(k)} /> {l}</label>)}</div></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Limite diário por cliente"><input name="dailyLimitPerClient" type="number" min={1} defaultValue={s.dailyLimitPerClient} className="input" /></Field>
                <Field label="Limite diário da loja"><input name="dailyGlobalLimit" type="number" min={1} defaultValue={s.dailyGlobalLimit} className="input" /></Field>
                <Field label="Custo por simulação (R$)" hint="Para controle; consulte a tabela do provedor."><input name="costPerRequest" defaultValue={centsToInput(s.costPerRequestCents)} className="input" /></Field>
                <Field label="Orçamento mensal (R$)" hint="Ao atingir, o provador pausa."><input name="monthlyBudget" defaultValue={centsToInput(s.monthlyBudgetCents)} className="input" /></Field>
                <Field label="Reter resultado (horas)" hint="0 = não armazena."><input name="retainResultsHours" type="number" min={0} max={72} defaultValue={s.retainResultsHours} className="input" /></Field>
              </div>
              <Field label="Texto de consentimento"><textarea name="consentText" defaultValue={s.consentText} rows={2} className="input" /></Field>
              <Field label="Aviso exibido com o resultado"><textarea name="disclaimer" defaultValue={s.disclaimer} rows={2} className="input" /></Field>
              <Field label="Mensagem quando indisponível"><textarea name="unavailableMessage" defaultValue={s.unavailableMessage} rows={2} className="input" /></Field>
              <Submit>Salvar configuração</Submit>
            </ActionForm>
          )}
        </Card>
      </div>
    </>
  );
}
