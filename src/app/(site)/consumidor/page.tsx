import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { formatMoney } from "@/lib/format";
import { Faq, Notice, PageHero, Section, Steps } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FAQ_CONSUMIDOR } from "@/content/faq";

export const metadata: Metadata = {
  title: "Regularização e análise de apontamentos no CPF",
  description: "Conheça seus direitos, consulte orientações e solicite análise administrativa de registros em cadastros de proteção ao crédito.",
  alternates: { canonical: "/consumidor" },
};

const TOPICS = [
  { id: "o-que-sao", title: "O que são apontamentos?", body: [
    "Apontamentos (também chamados de negativações ou restrições) são registros de dívidas em atraso incluídos em cadastros de proteção ao crédito, mantidos por empresas conhecidas como birôs de crédito. Esses cadastros são consultados por lojas, bancos e financeiras antes de conceder crédito.",
    "Um apontamento indica que um credor informou uma dívida vencida e não paga vinculada ao seu CPF. Ele não é uma penalidade definitiva: tem prazo máximo e deve seguir regras previstas no Código de Defesa do Consumidor (CDC).",
  ]},
  { id: "consultar", title: "Como consultar seu CPF?", body: [
    "Você pode consultar gratuitamente seus registros diretamente nos sites e aplicativos dos principais birôs de crédito, mediante cadastro.",
    "O Banco Central oferece o Registrato, sistema gratuito que mostra empréstimos, financiamentos, contas e chaves Pix vinculados ao seu CPF — útil para identificar operações que você não reconhece.",
    "Consulte sempre pelos canais oficiais de cada instituição e desconfie de sites que cobram para mostrar sua situação.",
  ]},
  { id: "incorretas", title: "Como identificar informações incorretas?", body: [
    "Confira cada registro e verifique: você reconhece a dívida? O valor está correto? A dívida já foi paga ou renegociada? Você recebeu a comunicação prévia antes da inclusão? O registro tem mais de 5 anos?",
    "Registros de dívidas que você não contratou podem indicar fraude ou uso indevido do seu CPF — nesse caso, registre boletim de ocorrência e comunique o credor e o birô imediatamente.",
  ]},
  { id: "contestar", title: "Como contestar registros incorretos?", body: [
    "1) Reúna comprovantes (pagamentos, acordos, correspondências). 2) Entre em contato com o credor e solicite a correção ou exclusão. 3) Abra contestação no birô de crédito onde o registro aparece. 4) Se não houver solução, registre reclamação no Procon ou na plataforma pública consumidor.gov.br. 5) Em último caso, é possível buscar o Juizado Especial Cível.",
    "Todas essas etapas podem ser feitas por você, gratuitamente. Nosso serviço é uma opção para quem prefere apoio na organização, análise e acompanhamento.",
  ]},
  { id: "direitos", title: "Direitos do consumidor", body: [
    "Pelo art. 43 do CDC, você tem direito de acessar as informações existentes sobre você em cadastros, de ser comunicado por escrito antes da inclusão de um registro e de exigir a correção de dados incorretos.",
    "O órgão mantenedor do cadastro é responsável pela notificação prévia do consumidor (Súmula 359 do STJ). Após a quitação, cabe ao credor pedir a exclusão do registro (Súmula 548 do STJ).",
  ]},
  { id: "prazos", title: "Prazos legais", body: [
    "Informações negativas não podem permanecer nos cadastros por mais de 5 anos (art. 43, §1º, do CDC e Súmula 323 do STJ).",
    "Após o pagamento da dívida, o credor tem 5 dias úteis para solicitar a exclusão do registro. Quando você solicita a correção de um dado incorreto, o arquivista deve comunicar a alteração aos destinatários em até 5 dias úteis (art. 43, §3º, do CDC).",
    "O fim do prazo de permanência no cadastro não extingue automaticamente uma dívida legítima.",
  ]},
];

export default async function ConsumidorPage() {
  const cfg = await getSetting("service.consumidor");
  return (
    <>
      <PageHero eyebrow="Consumidor" title="Solicite uma análise dos registros vinculados ao seu CPF." subtitle="Conheça seus direitos, consulte orientações e solicite análise administrativa de registros em cadastros de proteção ao crédito." crumbs={[{ href: "/servicos", label: "Serviços" }, { label: "Regularização e análise de apontamentos" }]}>
        <div className="flex flex-wrap gap-3">
          <Link href="/consumidor/solicitar" className="btn-primary">Solicitar análise <Icon name="arrow" className="h-4 w-4" /></Link>
          <a href="#como-funciona" className="btn-secondary">Como funciona</a>
        </div>
      </PageHero>

      <div className="container-portal grid gap-10 py-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Nesta página" className="hidden lg:block">
          <div className="sticky top-36 space-y-1 text-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Nesta página</p>
            {[...TOPICS.map((t) => [t.id, t.title]), ["como-funciona", "Como funciona nosso serviço"], ["valores", "Valores e escopo"], ["acompanhar", "Como acompanhar"], ["faq", "Perguntas frequentes"]].map(([id, t]) => (
              <a key={id} href={`#${id}`} className="block rounded px-2 py-1.5 text-muted no-underline hover:bg-surface hover:text-brand-700">{t}</a>
            ))}
          </div>
        </nav>
        <div className="min-w-0 space-y-10">
          <Notice tone="info" title="Você pode fazer isso gratuitamente">
            Consultas e contestações podem ser feitas diretamente por você nos birôs de crédito, com o credor, no Procon ou em consumidor.gov.br. O serviço do Portal Consumidor é privado e opcional.
          </Notice>
          {TOPICS.map((t) => (
            <section key={t.id} id={t.id} className="scroll-mt-36">
              <h2 className="text-2xl font-bold">{t.title}</h2>
              <div className="prose-portal mt-3">{t.body.map((p, i) => <p key={i}>{p}</p>)}</div>
            </section>
          ))}

          <section id="como-funciona" className="scroll-mt-36">
            <h2 className="mb-5 text-2xl font-bold">Como funciona nosso serviço</h2>
            <Steps steps={[
              { title: "Solicitação", text: "Você preenche o formulário com seus dados e as informações que conhece sobre os registros." },
              { title: "Análise administrativa", text: "Nossa equipe analisa os registros, verifica prazos, notificação prévia, valores e indícios de irregularidade." },
              { title: "Orientação", text: "Você recebe um parecer com seus direitos e as alternativas disponíveis, inclusive canais gratuitos." },
              { title: "Contestação", text: "Quando houver indício de irregularidade, elaboramos e protocolamos a contestação nos canais adequados." },
              { title: "Acompanhamento", text: "Acompanhamos as respostas e atualizamos o status da sua solicitação no portal." },
              { title: "Conclusão", text: "Você recebe o resultado das contestações. Dívidas legítimas permanecem devidas e podem ser negociadas com o credor." },
            ]} />
          </section>

          <section id="valores" className="scroll-mt-36">
            <h2 className="mb-5 text-2xl font-bold">Valores e escopo do serviço</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card border-brand-300 p-6">
                <p className="eyebrow">À vista via Pix</p>
                <p className="mt-2 text-4xl font-extrabold text-brand-800">{formatMoney(cfg.pixCents)}</p>
              </div>
              <div className="card p-6">
                <p className="eyebrow">Parcelado</p>
                <p className="mt-2 text-4xl font-extrabold text-ink">{formatMoney(cfg.installmentCents)}</p>
                <p className="mt-1 text-sm text-muted">Em até {cfg.maxInstallments} vezes, conforme condições.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm">
                <p className="mb-2 font-bold text-emerald-900">O que está incluído</p>
                <p className="text-emerald-950">{cfg.scope}</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-950">
                <p className="mb-2 font-bold">O que NÃO prometemos</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Remoção universal de dívidas ou registros.</li>
                  <li>Congelamento de registros por qualquer período.</li>
                  <li>Aumento de score.</li>
                  <li>Eliminação de dívidas legítimas.</li>
                  <li>Qualquer resultado garantido.</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="acompanhar" className="scroll-mt-36">
            <h2 className="text-2xl font-bold">Como acompanhar uma solicitação</h2>
            <div className="prose-portal mt-3">
              <p>Ao concluir a solicitação você recebe um <strong>número de protocolo</strong> e um <strong>código de acesso</strong>. Na página <Link href="/acompanhar">Acompanhar solicitação</Link>, informe os dois para ver o status, a data e os próximos passos. Por segurança, nenhum dado pessoal é exibido na consulta.</p>
            </div>
          </section>

          <section id="faq" className="scroll-mt-36">
            <h2 className="mb-5 text-2xl font-bold">Perguntas frequentes</h2>
            <Faq items={FAQ_CONSUMIDOR} />
          </section>

          <div className="card flex flex-col items-start gap-4 bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Pronto para solicitar a análise?</h2>
              <p className="text-sm text-muted">O formulário leva cerca de 5 minutos.</p>
            </div>
            <Link href="/consumidor/solicitar" className="btn-primary">Solicitar análise</Link>
          </div>
        </div>
      </div>
    </>
  );
}
