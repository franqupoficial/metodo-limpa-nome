import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { providerConfigured, providerFor, DEFAULT_MODELS } from "@/lib/ai/tryon";
import { testTryOnIntegration } from "../../_actions/ai";
import { formatDate, formatMoney } from "@/lib/format";
import { centsToInput } from "@/lib/action";
import { PageHeader, Card, Stat, Badge, Field, Alert, Empty } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/forms";
import { saveSettings } from "../../_actions/settings";
import { aiSupportConfigured } from "@/lib/ai/support";

export const metadata = { title: "Luxer AI" };
const CATS: [string, string][] = [["colares", "Colares"], ["correntes", "Correntes"], ["pingentes", "Pingentes"], ["brincos", "Brincos"], ["pulseiras", "Pulseiras"], ["aneis", "Anéis"]];

export default async function LuxerAI() {
  const admin = await requireAdmin("ai.view");
  const all = await getSettings();
  const s = all.ai;
  const cg = all.concierge;
  const [chats30, handoffs30] = await Promise.all([
    prisma.chatConversation.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) }, messages: { some: { role: "USER" } } } }),
    prisma.chatConversation.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) }, handoffReason: { not: null } } }),
  ]);
  const monthStart = new Date(new Date().toISOString().slice(0, 8) + "01T03:00:00Z");
  const dayStart = new Date(Date.now() - 86400000);
  const [month, byStatus, day, recent, errors, top, byCode, fid, assets] = await Promise.all([
    prisma.tryOnRequest.aggregate({ where: { createdAt: { gte: monthStart } }, _count: true, _sum: { costCents: true }, _avg: { durationMs: true } }),
    prisma.tryOnRequest.groupBy({ by: ["status"], where: { createdAt: { gte: monthStart } }, _count: true }),
    prisma.tryOnRequest.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.tryOnRequest.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { product: { select: { name: true, id: true } } } }),
    prisma.tryOnRequest.findMany({ where: { status: { in: ["FAILED", "BLOCKED"] }, errorCode: { notIn: ["region_not_found", "multiple_people", "photo_quality"] } }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.tryOnRequest.groupBy({ by: ["productId"], where: { createdAt: { gte: monthStart }, productId: { not: null } }, _count: true, orderBy: { _count: { productId: "desc" } }, take: 5 }),
    prisma.tryOnRequest.groupBy({ by: ["errorCode"], where: { createdAt: { gte: monthStart }, errorCode: { not: null } }, _count: true }),
    prisma.tryOnRequest.aggregate({ where: { createdAt: { gte: monthStart }, status: "SUCCEEDED" }, _avg: { fidelityScore: true, generations: true } }),
    prisma.tryOnAsset.count(),
  ]);
  const st = Object.fromEntries(byStatus.map((b) => [b.status, b._count])) as Record<string, number>;
  const codes = Object.fromEntries(byCode.map((b) => [b.errorCode!, b._count])) as Record<string, number>;
  const photoRejects = (codes.region_not_found ?? 0) + (codes.multiple_people ?? 0) + (codes.photo_quality ?? 0);
  const topNames = Object.fromEntries((await prisma.product.findMany({ where: { id: { in: top.map((t) => t.productId!) } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  const configured = providerConfigured(s.provider);
  const prov = providerFor(s.provider);
  const STAGE: Record<string, string> = { queued: "na fila", detect: "detecção", profile: "perfil da peça", generate: "geração", composite: "composição", verify: "verificação", done: "concluída" };
  const CODE: Record<string, string> = { region_not_found: "região não encontrada na foto", multiple_people: "mais de uma pessoa", photo_quality: "foto escura/tremida", fidelity_low: "reprovada na fidelidade", blocked: "recusada pelo provedor", timeout: "tempo esgotado", not_configured: "sem credencial", provider_rate_limit: "limite do provedor", no_image: "provedor sem imagem", analysis_invalid: "análise inválida", internal: "erro interno" };
  return (
    <>
      <PageHeader title="Luxer AI" subtitle="Concierge Luxer (atendimento com IA + equipe) e LUXER AI TRY-ON (provador virtual)." />
      <Card title="Concierge Luxer — atendimento" className="mb-6">
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Status" value={cg.enabled ? (cg.aiEnabled && aiSupportConfigured() ? "IA + equipe" : "Somente equipe") : "Desligado"} hint={aiSupportConfigured() ? cg.model : "ANTHROPIC_API_KEY ausente"} />
          <Stat label="Conversas (30 dias)" value={chats30} />
          <Stat label="Transferidas à equipe" value={handoffs30} hint={chats30 ? `${((handoffs30 / chats30) * 100).toFixed(0)}% das conversas` : undefined} />
          <div className="card flex items-center justify-center p-4"><Link href="/admin/atendimento" className="btn btn-primary">Abrir atendimento</Link></div>
        </div>
        {admin.can("ai.manage") && (
          <ActionForm action={saveSettings} className="grid gap-3 lg:grid-cols-2"><input type="hidden" name="group" value="concierge" />
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="enabled" defaultChecked={cg.enabled} /> Concierge (botão e chat) ativo na loja</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="aiEnabled" defaultChecked={cg.aiEnabled} /> IA responde primeiro (Claude)</label>
              <Field label="Modelo"><input name="model" defaultValue={cg.model} className="input font-mono text-xs" /></Field>
              <Field label="Mensagem de boas-vindas"><textarea name="greeting" defaultValue={cg.greeting} rows={3} className="input" /></Field>
              <Field label="Mensagem fora do horário"><textarea name="offlineMessage" defaultValue={cg.offlineMessage} rows={2} className="input" /></Field>
            </div>
            <div className="space-y-3">
              <Field label="Respostas rápidas (uma por linha: Título | Resposta)" hint="Exibidas como atalhos no Concierge e usadas pela IA como fonte oficial. Confira o texto do certificado antes de publicar."><textarea name="quickAnswers" rows={7} defaultValue={cg.quickAnswers.map((q) => `${q.title} | ${q.answer}`).join("\n")} className="input text-xs" /></Field>
              <Field label="Orientações adicionais para a IA" hint="Ex.: promoções vigentes, tom de voz, assuntos a evitar. A IA nunca inventa preços ou estoque: ela consulta o catálogo."><textarea name="extraInstructions" defaultValue={cg.extraInstructions} rows={4} className="input text-xs" /></Field>
              <Submit>Salvar Concierge</Submit>
            </div>
          </ActionForm>
        )}
      </Card>
      <h2 className="mb-3 mt-8 text-lg font-semibold">LUXER AI TRY-ON — provador virtual</h2>
      {!configured && <div className="mb-4"><Alert><b>Dependência pendente:</b> o provedor <b>{prov.label}</b> está selecionado, mas a variável <code>{prov.envKey}</code> não está configurada no servidor. Sem ela o provador com IA não aparece na loja (nenhum botão fica sem ação; o provador AR continua disponível). Crie a chave ({s.provider === "gemini" ? "Google AI Studio, projeto com faturamento ativo — no plano pago o Google não usa os dados para treinar modelos" : "plataforma da OpenAI, organização verificada para modelos de imagem"}) e cadastre-a em Vercel → Settings → Environment Variables; depois use “Testar integração”.</Alert></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Status" value={s.tryOnEnabled && configured ? "Ativo" : "Inativo"} hint={s.tryOnEnabled ? (configured ? "Gemini configurado" : "sem credencial") : "desligado no painel"} />
        <Stat label="Simulações no mês" value={month._count} hint={`${day} nas últimas 24h`} />
        <Stat label="Entregues / falhas" value={`${st.SUCCEEDED ?? 0} / ${(st.FAILED ?? 0) + (st.BLOCKED ?? 0)}`} hint={`${photoRejects} fotos inadequadas (sem custo de geração)`} />
        <Stat label="Fidelidade média" value={fid._avg.fidelityScore ? `${Math.round(fid._avg.fidelityScore)}/100` : "—"} hint={`mínimo ${s.fidelityThreshold} · ${codes.fidelity_low ?? 0} reprovadas`} />
        <Stat label="Custo estimado no mês" value={formatMoney(month._sum.costCents ?? 0)} hint={`orçamento ${formatMoney(s.monthlyBudgetCents)}`} />
        <Stat label="Tempo médio" value={month._avg.durationMs ? `${(month._avg.durationMs / 1000).toFixed(1)} s` : "—"} hint={`${assets} imagem(ns) temporária(s) guardada(s)`} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_460px]">
        <div className="min-w-0 space-y-5">
          <Card title="Solicitações recentes" pad={false}>{recent.length === 0 ? <Empty title="Nenhuma simulação ainda" /> : <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>Data</th><th>Peça</th><th>Categoria</th><th>Etapa</th><th>Status</th><th className="text-right">Fidelidade</th><th className="text-right">Tentativas</th><th className="text-right">Custo</th><th className="text-right">Tempo</th></tr></thead>
            <tbody>{recent.map((r) => <tr key={r.id}><td className="whitespace-nowrap text-xs">{formatDate(r.createdAt, true)}</td><td className="text-xs">{r.product ? <Link className="hover:underline" href={`/admin/produtos/${r.product.id}`}>{r.product.name}</Link> : "—"}</td><td className="text-xs">{r.category}</td><td className="text-xs">{STAGE[r.stage] ?? r.stage}</td>
              <td><Badge tone={r.status === "SUCCEEDED" ? "green" : r.status === "PROCESSING" || r.status === "QUEUED" ? "blue" : "red"}>{r.status}</Badge>{r.errorCode && <div className="mt-0.5 text-[10px] text-zinc-500">{CODE[r.errorCode] ?? r.errorCode}</div>}</td>
              <td className="text-right text-xs tabular-nums">{r.fidelityScore ?? "—"}</td><td className="text-right text-xs tabular-nums">{r.generations}</td><td className="text-right text-xs tabular-nums">{formatMoney(r.costCents)}</td><td className="text-right text-xs tabular-nums">{r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : "—"}</td></tr>)}</tbody></table></div>}</Card>
          <Card title="Erros técnicos recentes" pad={false}>{errors.length === 0 ? <Empty title="Nenhum erro técnico" /> : <table className="tbl"><tbody>{errors.map((e) => <tr key={e.id}><td className="whitespace-nowrap text-xs">{formatDate(e.createdAt, true)}</td><td className="font-mono text-xs">{e.errorCode}</td><td className="text-xs text-zinc-600">{e.errorMessage}</td></tr>)}</tbody></table>}</Card>
          <Card title="Motivos de não entrega no mês">{byCode.length ? <ul className="text-sm">{byCode.map((b) => <li key={b.errorCode} className="flex justify-between"><span>{CODE[b.errorCode!] ?? b.errorCode}</span><span className="tabular-nums">{b._count}</span></li>)}</ul> : <p className="text-sm text-zinc-500">Sem ocorrências.</p>}</Card>
          <Card title="Peças mais experimentadas no mês">{top.length ? <ul className="text-sm">{top.map((t) => <li key={t.productId} className="flex justify-between"><span>{topNames[t.productId!]}</span><span>{t._count}</span></li>)}</ul> : <p className="text-sm text-zinc-500">Sem dados.</p>}</Card>
          <Alert tone="blue"><b>Como funciona:</b> (1) visão computacional localiza a região do corpo e o ponto de aplicação; (2) o perfil técnico da joia é extraído das fotografias cadastradas; (3) a edição generativa altera só o recorte da região, com as fotos da peça como referência obrigatória; (4) o recorte volta à foto original por máscara suavizada — o resto da foto fica idêntico; (5) uma verificação independente dá a nota de fidelidade e, abaixo do mínimo, gera de novo ou não entrega. <b>Privacidade:</b> a foto fica criptografada só durante o processamento e é apagada ao final; o resultado fica criptografado pelo tempo de retenção e o cliente pode excluí-lo na hora. Ninguém da equipe vê as fotos.</Alert>
        </div>
        <div className="space-y-5">
          {admin.can("ai.manage") && <Card title="Diagnóstico"><p className="mb-3 text-xs text-zinc-500">Confere a chave no servidor e a disponibilidade dos modelos configurados, sem gerar imagem.</p><ActionForm action={testTryOnIntegration}><Submit>Testar integração</Submit></ActionForm></Card>}
          <Card title="Configuração">
          {!admin.can("ai.manage") ? <p className="text-sm text-zinc-500">Somente leitura para o seu perfil.</p> : (
            <ActionForm action={saveSettings} className="space-y-3"><input type="hidden" name="group" value="ai" />
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="tryOnEnabled" defaultChecked={s.tryOnEnabled} /> Provador ativo na loja</label>
              <Field label="Provedor de IA" hint={`Gemini: ${DEFAULT_MODELS.gemini.edit} + ${DEFAULT_MODELS.gemini.analysis}. OpenAI: ${DEFAULT_MODELS.openai.edit} (edição com máscara) + ${DEFAULT_MODELS.openai.analysis}. Ao trocar, ajuste os modelos e os custos.`}>
                <select name="provider" defaultValue={s.provider} className="input"><option value="gemini">Google Gemini{providerConfigured("gemini") ? " — chave configurada" : " — sem chave"}</option><option value="openai">OpenAI{providerConfigured("openai") ? " — chave configurada" : " — sem chave"}</option></select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Modelo de edição de imagem"><input name="model" defaultValue={s.model} className="input font-mono text-xs" /></Field>
                <Field label="Modelo de visão" hint="Detecção e verificação."><input name="analysisModel" defaultValue={s.analysisModel} className="input font-mono text-xs" /></Field>
              </div>
              <Field label="Categorias disponíveis"><div className="grid grid-cols-3 gap-1 text-sm">{CATS.map(([k, l]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" name="categories" value={k} defaultChecked={s.categories.includes(k)} /> {l}</label>)}</div></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fidelidade mínima (0–100)" hint="Abaixo disso o resultado não é entregue."><input name="fidelityThreshold" type="number" min={0} max={100} defaultValue={s.fidelityThreshold} className="input" /></Field>
                <Field label="Gerações por simulação" hint="Nova tentativa quando reprova (1–3)."><input name="maxGenerations" type="number" min={1} max={3} defaultValue={s.maxGenerations} className="input" /></Field>
                <Field label="Limite diário por cliente"><input name="dailyLimitPerClient" type="number" min={1} defaultValue={s.dailyLimitPerClient} className="input" /></Field>
                <Field label="Limite diário da loja"><input name="dailyGlobalLimit" type="number" min={1} defaultValue={s.dailyGlobalLimit} className="input" /></Field>
                <Field label="Custo por geração (R$)" hint="Consulte a tabela do provedor."><input name="costPerRequest" defaultValue={centsToInput(s.costPerRequestCents)} className="input" /></Field>
                <Field label="Custo por análise (R$)"><input name="analysisCost" defaultValue={centsToInput(s.analysisCostCents)} className="input" /></Field>
                <Field label="Orçamento mensal (R$)" hint="Ao atingir, o provador pausa."><input name="monthlyBudget" defaultValue={centsToInput(s.monthlyBudgetCents)} className="input" /></Field>
                <Field label="Retenção das imagens (min)" hint="5 a 1440. Depois, exclusão automática."><input name="retentionMinutes" type="number" min={5} max={1440} defaultValue={s.retentionMinutes} className="input" /></Field>
              </div>
              <Field label="Texto de consentimento"><textarea name="consentText" defaultValue={s.consentText} rows={3} className="input" /></Field>
              <Field label="Aviso exibido com o resultado"><textarea name="disclaimer" defaultValue={s.disclaimer} rows={2} className="input" /></Field>
              <Field label="Mensagem quando indisponível"><textarea name="unavailableMessage" defaultValue={s.unavailableMessage} rows={2} className="input" /></Field>
              <Submit>Salvar configuração</Submit>
            </ActionForm>
          )}
          </Card>
        </div>
      </div>
    </>
  );
}
